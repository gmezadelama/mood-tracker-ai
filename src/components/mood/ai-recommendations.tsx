"use client";

import { useState } from "react";

import { fallbackSuggestionsForMood, type MoodFallbackSuggestions } from "@/domain/mood/fallback-suggestions";

import { moodLabels, type AiFeatureStatus, type AiRecommendation, type MockMoodEntry } from "./mock-data";
import { generateMoodRecommendations, MoodApiError } from "./mood-api";

const UNAVAILABLE_MESSAGE = "AI suggestions aren't available right now. Please try again later.";
const QUOTA_MESSAGE = "AI suggestions are available again tomorrow.";

/**
 * Small, secondary panel for the current entry and the previous 3 — the
 * only entries the backend accepts generation requests for. Older
 * history simply isn't rendered here; there's no "generate" control to
 * withhold on it, and no separate history browser is needed.
 */
export function AiRecommendations({
  entries,
  aiQuotaRemaining,
  aiStatus,
  onRecommendationReady,
  onQuotaConsumed,
}: {
  entries: MockMoodEntry[];
  aiQuotaRemaining: number;
  aiStatus: AiFeatureStatus;
  onRecommendationReady: (entryId: string, recommendation: AiRecommendation) => void;
  onQuotaConsumed: () => void;
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [messageByEntryId, setMessageByEntryId] = useState<Record<string, string>>({});

  if (entries.length === 0) return null;

  async function handleGenerate(entryId: string) {
    setPendingId(entryId);
    setMessageByEntryId((current) => {
      if (!(entryId in current)) return current;
      const rest = { ...current };
      delete rest[entryId];
      return rest;
    });

    try {
      const result = await generateMoodRecommendations(entryId);
      if (result.status === "ready") {
        onRecommendationReady(entryId, result.recommendation);
        onQuotaConsumed();
      } else if (result.status === "quota_exhausted") {
        // Never reserved a quota unit server-side — nothing to reconcile.
        setMessageByEntryId((current) => ({ ...current, [entryId]: QUOTA_MESSAGE }));
      } else {
        // The Generate control only renders when aiStatus is "available",
        // so a per-request "unavailable" result here can only be the
        // provider/validation-failure path — quota was reserved before
        // Gemini was called, so it needs to be reconciled too.
        onQuotaConsumed();
        setMessageByEntryId((current) => ({ ...current, [entryId]: UNAVAILABLE_MESSAGE }));
      }
    } catch (error) {
      setMessageByEntryId((current) => ({
        ...current,
        [entryId]: error instanceof MoodApiError ? error.message : UNAVAILABLE_MESSAGE,
      }));
    } finally {
      setPendingId(null);
    }
  }

  return (
    <section aria-label="AI suggestions" className="mt-8 rounded-2xl border border-blue-100 bg-white p-5 sm:p-6">
      <h2 className="text-[18px] font-semibold text-navy">AI suggestions</h2>
      <p className="mt-1 text-[14px] text-navy-muted">
        Optional, gentle suggestions for your current and last 3 check-ins — not medical advice.
      </p>

      <ul className="mt-5 grid gap-3">
        {entries.map((entry) => (
          <li key={entry.id} className="rounded-xl border border-blue-100 p-4">
            <p className="text-[14px] font-semibold text-navy">
              {formatShortDate(entry.entryDate)} · {moodLabels[entry.mood]}
            </p>

            {entry.aiRecommendation ? (
              <>
                <SourceLabel text="Personalized by AI" />
                <RecommendationContent recommendation={entry.aiRecommendation} />
              </>
            ) : (
              <>
                <SourceLabel text="Based on your selected mood" />
                <RecommendationContent recommendation={fallbackSuggestionsForMood(entry.mood)} />

                {messageByEntryId[entry.id] ? (
                  <p className="mt-2 text-[13px] text-navy-muted">{messageByEntryId[entry.id]}</p>
                ) : aiStatus === "unavailable" ? (
                  // Missing/invalid provider configuration — distinct from
                  // an exhausted quota; "available again tomorrow" would
                  // be misleading here since a reset can't fix this.
                  <p className="mt-2 text-[13px] text-navy-muted">{UNAVAILABLE_MESSAGE}</p>
                ) : aiQuotaRemaining > 0 ? (
                  <button
                    type="button"
                    aria-busy={pendingId === entry.id}
                    disabled={pendingId !== null}
                    className="mt-2 text-[13px] font-semibold text-brand outline-none hover:underline focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50 disabled:no-underline"
                    onClick={() => void handleGenerate(entry.id)}
                  >
                    {pendingId === entry.id
                      ? "Generating personalized suggestions…"
                      : "Generate personalized suggestions"}
                  </button>
                ) : (
                  <p className="mt-2 text-[13px] text-navy-muted">{QUOTA_MESSAGE}</p>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function SourceLabel({ text }: { text: string }) {
  return <p className="mt-1 text-[12px] font-medium text-navy-muted/80">{text}</p>;
}

function RecommendationContent({
  recommendation,
}: {
  recommendation: AiRecommendation | MoodFallbackSuggestions;
}) {
  return (
    <div className="mt-2 grid gap-2 text-[14px] text-navy-muted">
      <ul className="list-disc pl-5">
        {recommendation.activities.map((activity, index) => (
          <li key={index}>{activity}</li>
        ))}
      </ul>
      <ul className="list-disc pl-5 italic">
        {recommendation.phrases.map((phrase, index) => (
          <li key={index}>{phrase}</li>
        ))}
      </ul>
    </div>
  );
}

function formatShortDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
