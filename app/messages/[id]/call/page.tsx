"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PhoneOff, Mic, MicOff } from "lucide-react";

/**
 * Voice call signaling strategy (spec §41):
 * Supabase Realtime Broadcast channel `call:{conversationId}` carries
 * SDP offers/answers and ICE candidates between the two peers. No custom
 * signaling server is needed — this rides on the same Supabase project.
 *
 * STUN: Google's public STUN server (free). For production-grade
 * reliability behind restrictive NATs, add a TURN server via
 * NEXT_PUBLIC_TURN_URL / _USERNAME / _CREDENTIAL in .env — optional,
 * calls still work on most networks without it.
 */
const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  ...(process.env.NEXT_PUBLIC_TURN_URL
    ? [
        {
          urls: process.env.NEXT_PUBLIC_TURN_URL,
          username: process.env.NEXT_PUBLIC_TURN_USERNAME,
          credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
        } as RTCIceServer,
      ]
    : [
        // Free fallback TURN so calls have a real chance of connecting on
        // restrictive networks even before you set up your own TURN server.
        // These are openrelay.metered.ca's PUBLIC, SHARED test credentials —
        // free, but rate-limited and used by everyone on the internet who
        // hasn't configured their own, so don't rely on this for production
        // traffic at real scale. Set NEXT_PUBLIC_TURN_URL/_USERNAME/_CREDENTIAL
        // in .env.local (see §15 "Free vs Paid" in the README) to replace it
        // with a dedicated TURN server once Z has real usage.
        { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
        { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
      ]),
];

type CallStatus = "connecting" | "ringing" | "active" | "ended";

export default function VoiceCallPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isCaller = searchParams.get("role") === "caller";
  const supabase = createClient();

  const [status, setStatus] = useState<CallStatus>("connecting");
  const [muted, setMuted] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const channel = supabase.channel(`call:${id}`, { config: { broadcast: { self: false } } });

    async function setup() {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcRef.current = pc;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = event.streams[0];
        }
        setStatus("active");
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          channel.send({ type: "broadcast", event: "ice", payload: event.candidate });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
          endCall();
        }
      };

      channel
        .on("broadcast", { event: "offer" }, async ({ payload }) => {
          await pc.setRemoteDescription(new RTCSessionDescription(payload));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          channel.send({ type: "broadcast", event: "answer", payload: answer });
        })
        .on("broadcast", { event: "answer" }, async ({ payload }) => {
          await pc.setRemoteDescription(new RTCSessionDescription(payload));
        })
        .on("broadcast", { event: "ice" }, async ({ payload }) => {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(payload));
          } catch {
            /* ignore race candidates arriving before remote description */
          }
        })
        .on("broadcast", { event: "hangup" }, () => endCall())
        .subscribe(async (subStatus) => {
          if (subStatus === "SUBSCRIBED") {
            setStatus("ringing");
            // Only the explicit caller (spec §41: Call/Accept) sends the
            // initial offer; the callee waits for it and answers. This
            // avoids the glare condition of both peers offering at once.
            if (isCaller) {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              channel.send({ type: "broadcast", event: "offer", payload: offer });
            }
          }
        });
    }

    setup();

    timer = setInterval(() => setSeconds((s) => s + 1), 1000);

    function endCall() {
      setStatus("ended");
      pcRef.current?.close();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      if (timer) clearInterval(timer);
    }

    return () => {
      channel.send({ type: "broadcast", event: "hangup", payload: {} });
      supabase.removeChannel(channel);
      endCall();
    };
  }, [id]);

  function toggleMute() {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getAudioTracks().forEach((t) => (t.enabled = muted));
    setMuted((m) => !m);
  }

  return (
    <main dir="rtl" className="min-h-screen bg-y-deep text-white flex flex-col items-center justify-between py-16">
      <audio ref={remoteAudioRef} autoPlay />

      <div className="text-center">
        <div className="w-24 h-24 rounded-full bg-y-lavender/30 mx-auto mb-4" />
        <p className="text-lg font-medium">
          {status === "connecting" && "در حال اتصال..."}
          {status === "ringing" && "در حال زنگ خوردن..."}
          {status === "active" && formatDuration(seconds)}
          {status === "ended" && "تماس پایان یافت"}
        </p>
      </div>

      <div className="flex items-center gap-6">
        <button
          onClick={toggleMute}
          aria-label={muted ? "روشن کردن میکروفون" : "خاموش کردن میکروفون"}
          aria-pressed={muted}
          className="w-14 h-14 rounded-full bg-surface-light/10 flex items-center justify-center"
        >
          {muted ? <MicOff size={22} /> : <Mic size={22} />}
        </button>
        <button
          onClick={() => router.back()}
          aria-label="پایان تماس"
          className="w-16 h-16 rounded-full bg-danger flex items-center justify-center"
        >
          <PhoneOff size={26} />
        </button>
      </div>
    </main>
  );
}

function formatDuration(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}
