"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const HEARTBEAT_MS = 30_000;
const IDLE_AWAY_MS = 2 * 60_000;

/**
 * Mount this once near the root of the authenticated app (see
 * app/pulse/page.tsx). It keeps user_presence roughly accurate without
 * needing a dedicated realtime server:
 * - online: heartbeat every 30s while the tab is visible and active
 * - away: no interaction for 2 minutes, or tab hidden
 * - offline: tab/window closed (best-effort via 'pagehide')
 */
export function PresenceHeartbeat() {
  useEffect(() => {
    const supabase = createClient();
    let userId: string | null = null;
    let lastActivity = Date.now();
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

    async function setStatus(status: "online" | "away" | "offline") {
      if (!userId) return;
      await supabase
        .from("user_presence")
        .upsert({ user_id: userId, status, last_seen_at: new Date().toISOString() });
    }

    function markActivity() {
      lastActivity = Date.now();
    }

    async function tick() {
      if (document.hidden) {
        setStatus("away");
        return;
      }
      const idleFor = Date.now() - lastActivity;
      setStatus(idleFor > IDLE_AWAY_MS ? "away" : "online");
    }

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      userId = user.id;
      await setStatus("online");
      heartbeatTimer = setInterval(tick, HEARTBEAT_MS);
    })();

    document.addEventListener("visibilitychange", tick);
    window.addEventListener("mousemove", markActivity);
    window.addEventListener("keydown", markActivity);
    window.addEventListener("touchstart", markActivity);
    window.addEventListener("pagehide", () => setStatus("offline"));

    return () => {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("mousemove", markActivity);
      window.removeEventListener("keydown", markActivity);
      window.removeEventListener("touchstart", markActivity);
    };
  }, []);

  return null;
}
