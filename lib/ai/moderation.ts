/**
 * Z — Optional AI layer (spec §42).
 *
 * Design rule: every function here MUST fail open and cheap when no
 * provider key is configured, so Z works fully without AI. Nothing in
 * the app should ever block on these calls — treat their output as a
 * hint, not a gate.
 */

const AI_ENABLED = Boolean(process.env.AI_PROVIDER_API_KEY);

export function isAiEnabled() {
  return AI_ENABLED;
}

/**
 * Very cheap heuristic spam check that runs even without AI configured
 * (repeated characters, excessive links, all-caps shouting). This is the
 * baseline; if AI_PROVIDER_API_KEY is set, a real classifier can replace
 * or augment it later.
 */
export function heuristicSpamScore(text: string): number {
  if (!text) return 0;
  let score = 0;
  const linkCount = (text.match(/https?:\/\//g) || []).length;
  if (linkCount >= 3) score += 0.4;
  if (/(.)\1{6,}/.test(text)) score += 0.3; // e.g. "aaaaaaa"
  const letters = text.replace(/[^a-zA-Z]/g, "");
  if (letters.length > 20 && letters === letters.toUpperCase()) score += 0.2;
  return Math.min(score, 1);
}

/**
 * Suggested friends for a user. Without AI configured, falls back to a
 * simple "friends of friends" SQL-backed suggestion (implemented at the
 * call site via Supabase, not here) — this function only adds an AI-based
 * re-ranking on top when available.
 *
 * When enabled, this asks the provider to reorder candidates by relevance
 * given a short text context (e.g. shared interests from bios). It never
 * adds or removes candidates — only reorders — so a bad/slow AI response
 * can only make suggestions less optimal, never break the page.
 */
export async function rerankSuggestions<T extends { id: string; display_name?: string | null; bio?: string | null }>(
  candidates: T[],
  context: { viewerBio?: string | null }
): Promise<T[]> {
  if (!AI_ENABLED || candidates.length < 2) return candidates;

  try {
    const baseUrl = process.env.AI_PROVIDER_BASE_URL || "https://api.openai.com/v1";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const list = candidates
      .map((c, i) => `${i}: ${c.display_name ?? "?"}${c.bio ? " — " + c.bio : ""}`)
      .join("\n");

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.AI_PROVIDER_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.AI_PROVIDER_MODEL || "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Reorder people by likely relevance to the viewer. Reply with ONLY a comma-separated list of the given indices, most relevant first. No other text.",
          },
          {
            role: "user",
            content: `Viewer bio: ${context.viewerBio ?? "(none)"}\n\nCandidates:\n${list}`,
          },
        ],
        temperature: 0,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return candidates;
    const data = await res.json();
    const raw: string = data?.choices?.[0]?.message?.content ?? "";
    const order = raw
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => Number.isInteger(n) && n >= 0 && n < candidates.length);

    if (order.length !== candidates.length) return candidates; // malformed response — ignore, keep default order
    return order.map((i) => candidates[i]);
  } catch {
    return candidates; // fail open on any error
  }
}

/**
 * Content moderation check for posts/comments/messages before publish.
 * Always returns { allowed: true } when AI is disabled — the heuristic
 * spam score above still runs independently as a lightweight backstop.
 *
 * When AI_PROVIDER_API_KEY is set, this calls an OpenAI-compatible
 * moderation endpoint (works with OpenAI directly, or any compatible
 * gateway via AI_PROVIDER_BASE_URL). ANY failure here — network error,
 * timeout, bad response — falls open to `allowed: true`. A broken AI
 * provider must never be able to take Z's publish flow down.
 */
export async function moderateContent(
  text: string
): Promise<{ allowed: boolean; reason?: string }> {
  const spam = heuristicSpamScore(text);
  if (spam >= 0.7) {
    return { allowed: false, reason: "spam_heuristic" };
  }
  if (!AI_ENABLED) return { allowed: true };

  try {
    const baseUrl = process.env.AI_PROVIDER_BASE_URL || "https://api.openai.com/v1";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000); // never let AI slow down publishing

    const res = await fetch(`${baseUrl}/moderations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.AI_PROVIDER_API_KEY}`,
      },
      body: JSON.stringify({ input: text }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return { allowed: true }; // fail open on provider error

    const data = await res.json();
    const flagged = data?.results?.[0]?.flagged;
    if (flagged) return { allowed: false, reason: "ai_moderation" };
    return { allowed: true };
  } catch {
    return { allowed: true }; // fail open on network error/timeout
  }
}
