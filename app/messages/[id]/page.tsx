"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { MediaAttachment } from "@/components/chat/MediaAttachment";
import { ArrowRight, Send, Mic, Square, Phone } from "lucide-react";

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string | null;
  message_type: string;
  created_at: string;
  message_media?: { storage_path: string; media_type: string; duration_seconds: number | null }[];
};

type OtherUser = { username: string; display_name: string | null; avatar_url: string | null } | null;

export default function ConversationPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [otherUser, setOtherUser] = useState<OtherUser>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);

      if (user) {
        await supabase
          .from("conversation_members")
          .update({ last_read_at: new Date().toISOString() })
          .eq("conversation_id", id)
          .eq("user_id", user.id);

        // Fetch the other participant so the header can show their real
        // name/avatar and link to their profile (previously this header
        // just said "مکالمه" and went nowhere).
        const { data: otherMember } = await supabase
          .from("conversation_members")
          .select("profiles!conversation_members_user_id_fkey(username, display_name, avatar_url)")
          .eq("conversation_id", id)
          .neq("user_id", user.id)
          .maybeSingle();
        setOtherUser((otherMember as any)?.profiles ?? null);
      }

      const { data } = await supabase
        .from("messages")
        .select("id, conversation_id, sender_id, body, message_type, created_at, message_media(storage_path, media_type, duration_seconds)")
        .eq("conversation_id", id)
        .is("deleted_at", null)
        .order("created_at", { ascending: true })
        .limit(200);
      setMessages(data ?? []);

      // Realtime: subscribe to new messages in this conversation.
      channel = supabase
        .channel(`conversation:${id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
          async (payload) => {
            // Voice/media messages attach their row slightly after the
            // message insert, so re-fetch that one row with its media joined.
            const { data: full } = await supabase
              .from("messages")
              .select("id, conversation_id, sender_id, body, message_type, created_at, message_media(storage_path, media_type, duration_seconds)")
              .eq("id", (payload.new as Message).id)
              .maybeSingle();
            setMessages((prev) => [...prev, (full as Message) ?? (payload.new as Message)]);
          }
        )
        .subscribe();
    })();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function sendMessage() {
    if (!draft.trim() || !userId) return;
    const body = draft;
    setDraft("");
    setSendError(null);
    const { error } = await supabase.from("messages").insert({
      conversation_id: id,
      sender_id: userId,
      body,
      message_type: "text",
    });
    if (error) {
      // The DB trigger (migration 0005) throws with this specific message
      // when the sender's rate limit is hit — surface it plainly instead
      // of silently dropping the message.
      if (error.message?.includes("rate_limit_exceeded")) {
        setSendError("پیام‌های زیادی فرستادی — چند لحظه صبر کن.");
      } else {
        setSendError("ارسال پیام ناموفق بود.");
      }
      setDraft(body); // give the text back so nothing is lost
    }
    // No manual state push needed on success — the INSERT above triggers
    // the postgres_changes subscription for everyone, including us.
  }

  async function startRecording() {
    if (!userId) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.start();
      setRecording(true);
      setRecordSeconds(0);
      recordTimerRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    } catch {
      // microphone permission denied or unavailable — silently no-op,
      // the mic button simply won't start recording.
    }
  }

  async function stopRecording() {
    const recorder = mediaRecorderRef.current;
    if (!recorder || !userId) return;

    const duration = recordSeconds;
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    setRecording(false);

    const stopped = new Promise<Blob>((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunksRef.current, { type: "audio/webm" }));
    });
    recorder.stop();
    recorder.stream.getTracks().forEach((t) => t.stop());
    const blob = await stopped;

    if (duration < 1) return; // ignore accidental taps

    const { data: inserted, error } = await supabase
      .from("messages")
      .insert({ conversation_id: id, sender_id: userId, message_type: "audio" })
      .select("id")
      .single();
    if (error || !inserted) return;

    const path = `${userId}/${inserted.id}.webm`;
    const { error: uploadError } = await supabase.storage.from("voice").upload(path, blob, { upsert: true });
    if (!uploadError) {
      await supabase.from("message_media").insert({
        message_id: inserted.id,
        storage_path: path,
        media_type: "audio",
        duration_seconds: duration,
      });
    }
  }

  return (
    <main dir="rtl" className="min-h-screen flex flex-col bg-surface-light">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-y-soft">
        <button onClick={() => router.push("/messages")} className="text-ink-muted" aria-label="بازگشت">
          <ArrowRight size={20} />
        </button>
        <Link href={otherUser ? `/profile/${otherUser.username}` : "#"} className="flex-1 flex items-center gap-2 min-w-0">
          <div className="relative w-8 h-8 rounded-full bg-y-lavender flex items-center justify-center text-xs font-semibold text-y-deep overflow-hidden flex-shrink-0">
            {otherUser?.avatar_url ? (
              <img src={otherUser.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              (otherUser?.display_name ?? otherUser?.username ?? "?")[0]?.toUpperCase()
            )}
          </div>
          <p className="text-sm font-medium truncate">
            {otherUser?.display_name ?? otherUser?.username ?? "مکالمه"}
          </p>
        </Link>
        <button
          onClick={() => router.push(`/messages/${id}/call?role=caller`)}
          className="text-y-royal"
          aria-label="تماس صوتی"
        >
          <Phone size={20} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {messages.map((m) => {
          const mine = m.sender_id === userId;
          const media = m.message_media?.[0];
          return (
            <div key={m.id} className={`flex ${mine ? "justify-start" : "justify-end"}`}>
              <div
                className={`max-w-[75%] rounded-y px-3.5 py-2 text-sm ${
                  mine ? "bg-y-royal text-white" : "bg-y-soft text-ink"
                }`}
              >
                {media ? (
                  <MediaAttachment
                    bucket={media.media_type === "audio" ? "voice" : "messages"}
                    path={media.storage_path}
                    mediaType={media.media_type}
                    durationSeconds={media.duration_seconds}
                  />
                ) : (
                  m.body
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {sendError && (
        <p className="px-4 pb-1 text-xs text-danger text-center">{sendError}</p>
      )}

      <footer className="flex items-center gap-2 px-4 py-3 border-t border-y-soft">
        {recording ? (
          <button
            onClick={stopRecording}
            className="w-9 h-9 rounded-full bg-danger text-white flex items-center justify-center animate-pulse"
            aria-label="پایان ضبط"
          >
            <Square size={15} />
          </button>
        ) : (
          <button onClick={startRecording} className="text-ink-muted" aria-label="پیام صوتی">
            <Mic size={20} />
          </button>
        )}
        {recording ? (
          <span className="flex-1 text-xs text-danger text-center">
            در حال ضبط... {String(Math.floor(recordSeconds / 60)).padStart(2, "0")}:
            {String(recordSeconds % 60).padStart(2, "0")}
          </span>
        ) : (
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="پیام بنویس..."
            className="flex-1 rounded-full bg-y-soft/60 px-4 py-2.5 text-sm outline-none"
          />
        )}
        <button
          onClick={sendMessage}
          disabled={!draft.trim() || recording}
          aria-label="ارسال پیام"
          className="w-9 h-9 rounded-full bg-y-royal text-white flex items-center justify-center disabled:opacity-40"
        >
          <Send size={16} />
        </button>
      </footer>
    </main>
  );
}
