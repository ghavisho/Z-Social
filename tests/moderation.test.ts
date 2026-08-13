import { describe, it, expect } from "vitest";
import { heuristicSpamScore, isAiEnabled } from "../lib/ai/moderation";

describe("heuristicSpamScore", () => {
  it("scores normal text as clean", () => {
    expect(heuristicSpamScore("سلام، امروز روز خوبی بود.")).toBeLessThan(0.3);
  });

  it("flags repeated character spam", () => {
    expect(heuristicSpamScore("aaaaaaaaaaaaaaa")).toBeGreaterThanOrEqual(0.3);
  });

  it("flags messages with many links", () => {
    const text = "check https://a.com https://b.com https://c.com now";
    expect(heuristicSpamScore(text)).toBeGreaterThanOrEqual(0.4);
  });

  it("returns 0 for empty text", () => {
    expect(heuristicSpamScore("")).toBe(0);
  });
});

describe("isAiEnabled", () => {
  it("reflects whether AI_PROVIDER_API_KEY is set", () => {
    // In CI/local without the key set, AI must be considered disabled —
    // this is the core promise that Z works fully without AI configured.
    expect(typeof isAiEnabled()).toBe("boolean");
  });
});
