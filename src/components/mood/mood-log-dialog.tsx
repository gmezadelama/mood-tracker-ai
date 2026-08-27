"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState, type RefObject } from "react";

import { FEELINGS, MAX_FEELINGS_PER_ENTRY, type Feeling } from "@/domain/mood/constants";

import {
  moodIconNames,
  moodLabels,
  sleepLabels,
  type AiFeatureStatus,
  type MockMood,
  type MockSleepRange,
} from "./mock-data";
import { inferMood, type MoodEntryDraft } from "./mood-api";
import { AiQuotaNotice } from "./ai-quota-notice";

const JOURNAL_LIMIT = 150;
const AI_REFLECTION_MIN = 10;
const MAX_INFERENCE_ATTEMPTS_PER_SESSION = 2;
const moods: MockMood[] = [2, 1, 0, -1, -2];
const sleepRanges: MockSleepRange[] = [9, 7.5, 5.5, 3.5, 1];

type Step = "mood" | "feelings" | "reflection" | "review" | "sleep";

interface Draft {
  mood: MockMood | null;
  feelings: Feeling[];
  journalEntry: string;
  sleepHours: MockSleepRange | null;
}

const initialDraft: Draft = { mood: null, feelings: [], journalEntry: "", sleepHours: null };

export function MoodLogDialog({
  entryDate,
  aiQuotaRemaining,
  aiStatus,
  onAiQuotaRemainingChange,
  onClose,
  onSubmit,
}: {
  entryDate: string;
  aiQuotaRemaining: number;
  aiStatus: AiFeatureStatus;
  onAiQuotaRemainingChange: (remaining: number) => void;
  onClose: () => void;
  onSubmit: (entry: MoodEntryDraft) => Promise<void>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const stepHeadingRef = useRef<HTMLElement>(null);
  const titleId = useId();
  const [step, setStep] = useState<Step>("mood");
  const [isAssisted, setIsAssisted] = useState(false);
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [error, setError] = useState("");
  const [aiMessage, setAiMessage] = useState("");
  const [isInferring, setIsInferring] = useState(false);
  const [hasRequestedInference, setHasRequestedInference] = useState(false);
  const [inferenceAttempts, setInferenceAttempts] = useState(0);
  const [hasValidSuggestion, setHasValidSuggestion] = useState(false);
  const [hasUsedRetry, setHasUsedRetry] = useState(false);
  const [suggestionVersion, setSuggestionVersion] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isBusy = isInferring || isSubmitting;
  const steps: Step[] = isAssisted
    ? ["mood", "reflection", "review", "sleep"]
    : ["mood", "feelings", "reflection", "sleep"];
  const stepIndex = steps.indexOf(step);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    }
    dialog.focus();
  }, []);

  useEffect(() => {
    if (step !== "mood") stepHeadingRef.current?.focus();
  }, [step, suggestionVersion]);

  function close() {
    if (isBusy) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (typeof dialog.close === "function") dialog.close();
    else {
      dialog.removeAttribute("open");
      onClose();
    }
  }

  function advanceManual() {
    if (step === "mood") {
      if (draft.mood === null) return setError("Please select a mood before continuing.");
      setStep("feelings");
    } else if (step === "feelings") {
      if (draft.feelings.length === 0) return setError("Please select at least one tag before continuing.");
      setStep("reflection");
    } else if (step === "reflection") {
      if (draft.journalEntry.trim().length === 0) return setError("Please write a short reflection before continuing.");
      setStep("sleep");
    }
    setError("");
  }

  function startAssistance() {
    setIsAssisted(true);
    setDraft((current) => ({ ...current, mood: null, feelings: [] }));
    setError("");
    setAiMessage("");
    // This resets only the guard for the assisted-mode visit. The dialog-
    // lifetime attempt count deliberately survives manual/assisted mode
    // changes, so cycling between them can never unlock a third request.
    setHasRequestedInference(false);
    setStep("reflection");
  }

  function returnToManual() {
    setIsAssisted(false);
    setDraft((current) => ({ ...current, mood: null, feelings: [] }));
    setError("");
    setAiMessage("");
    setStep("mood");
  }

  async function requestInference() {
    if (hasRequestedInference || inferenceAttempts >= MAX_INFERENCE_ATTEMPTS_PER_SESSION) return;
    const reflection = draft.journalEntry.trim();
    if (reflection.length < AI_REFLECTION_MIN) {
      setError("Add a little more about how you're feeling so AI can suggest a mood.");
      return;
    }

    setError("");
    setAiMessage("");
    setHasRequestedInference(true);
    setInferenceAttempts((current) => current + 1);
    setIsInferring(true);
    try {
      const result = await inferMood(reflection);
      onAiQuotaRemainingChange(result.aiQuotaRemaining);
      if (result.status === "ready") {
        setDraft((current) => ({ ...current, mood: result.inference.mood, feelings: result.inference.feelings }));
        setHasValidSuggestion(true);
        setStep("review");
      } else if (result.status === "quota_exhausted") {
        setAiMessage("AI mood assistance will be back tomorrow. You've reached today's limit, but you can still choose your mood and feelings yourself.");
      } else {
        setAiMessage("AI mood assistance isn't available right now. You can still choose your mood and feelings yourself.");
      }
    } catch {
      setAiMessage("AI mood assistance isn't available right now. You can still choose your mood and feelings yourself.");
    } finally {
      setIsInferring(false);
    }
  }

  async function retryInference() {
    if (
      !hasValidSuggestion
      || hasUsedRetry
      || inferenceAttempts >= MAX_INFERENCE_ATTEMPTS_PER_SESSION
      || aiQuotaRemaining < 1
      || isInferring
    ) return;

    setHasUsedRetry(true);
    setInferenceAttempts((current) => current + 1);
    setError("");
    setAiMessage("");
    setIsInferring(true);
    try {
      const result = await inferMood(draft.journalEntry.trim());
      onAiQuotaRemainingChange(result.aiQuotaRemaining);
      if (result.status === "ready") {
        setDraft((current) => ({ ...current, mood: result.inference.mood, feelings: result.inference.feelings }));
        setSuggestionVersion((current) => current + 1);
      } else if (result.status === "quota_exhausted") {
        setAiMessage("AI mood assistance will be back tomorrow. You've reached today's limit, but you can still choose your mood and feelings yourself.");
      } else {
        setAiMessage("AI mood assistance isn't available right now. You can still edit this suggestion and continue.");
      }
    } catch {
      setAiMessage("AI mood assistance isn't available right now. You can still edit this suggestion and continue.");
    } finally {
      setIsInferring(false);
    }
  }

  function confirmReview() {
    if (draft.mood === null) return setError("Please select the mood that fits best.");
    if (draft.feelings.length === 0) return setError("Please select at least one feeling before continuing.");
    setError("");
    setStep("sleep");
  }

  function back() {
    setError("");
    setAiMessage("");
    if (step === "review") setStep("reflection");
    else if (step === "sleep" && isAssisted) setStep("review");
  }

  function returnToReview() {
    setError("");
    setAiMessage("");
    setStep("review");
  }

  async function submit() {
    if (draft.sleepHours === null || draft.mood === null || draft.feelings.length === 0) {
      setError("Please enter how many hours you slept.");
      return;
    }
    setError("");
    setIsSubmitting(true);
    try {
      await onSubmit({
        entryDate,
        mood: draft.mood,
        feelings: draft.feelings,
        journalEntry: draft.journalEntry.trim(),
        sleepHours: draft.sleepHours,
      });
      setIsSubmitting(false);
      close();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "We couldn't save your check-in. Please try again.");
      setIsSubmitting(false);
    }
  }

  function toggleFeeling(feeling: Feeling) {
    if (draft.feelings.includes(feeling)) {
      setDraft((current) => ({ ...current, feelings: current.feelings.filter((item) => item !== feeling) }));
      setError("");
      return;
    }
    if (draft.feelings.length === MAX_FEELINGS_PER_ENTRY) {
      setError("You can only select a maximum of 3 tags.");
      return;
    }
    setDraft((current) => ({ ...current, feelings: [...current.feelings, feeling] }));
    setError("");
  }

  return (
    <dialog
      ref={dialogRef}
      aria-busy={isBusy}
      aria-labelledby={titleId}
      className="m-0 h-dvh max-h-none w-dvw max-w-none overflow-y-auto rounded-none bg-[linear-gradient(180deg,#f5f5ff_73%,#e0e0ff_100%)] p-0 text-navy shadow-none outline-none backdrop:bg-navy/70 sm:m-auto sm:h-fit sm:max-h-[calc(100dvh-32px)] sm:w-[calc(100%-32px)] sm:max-w-[600px] sm:rounded-2xl sm:shadow-[0_20px_60px_rgba(33,33,77,0.3)]"
      tabIndex={-1}
      onCancel={(event) => { event.preventDefault(); close(); }}
      onClose={onClose}
      onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); close(); } }}
    >
      <div className="relative px-5 pb-8 pt-8 sm:px-10 sm:pb-12 sm:pt-12">
        <h2 id={titleId} className="text-[32px] font-bold leading-[45px] tracking-[-1px] sm:text-[40px] sm:leading-[48px]">Log your mood.</h2>
        <button
          type="button"
          aria-label="Close mood logging"
          className="fixed right-5 top-5 z-10 grid size-10 place-items-center rounded-full bg-[#f5f5ff]/95 text-[30px] leading-none text-navy-muted outline-none hover:bg-white/70 focus-visible:ring-2 focus-visible:ring-brand sm:absolute sm:right-6 sm:top-5 sm:bg-transparent"
          onClick={close}
          disabled={isBusy}
        >×</button>

        <div aria-label={`Step ${stepIndex + 1} of 4`} className="mt-8 grid grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((index) => (
            <span key={index} className={`h-1.5 rounded-full ${index <= stepIndex ? "bg-brand" : "bg-blue-100"}`} />
          ))}
        </div>

        <div className="mt-8">
          {step === "mood" && (
            <>
              <MoodSelector
                mood={draft.mood}
                onChange={(mood) => { setDraft((current) => ({ ...current, mood })); setError(""); }}
                errorId={error ? `${titleId}-error` : undefined}
              />
              <section className="mt-8 border-t border-blue-100 pt-6" aria-labelledby={`${titleId}-assist-heading`}>
                <h3 id={`${titleId}-assist-heading`} className="text-[20px] font-bold text-navy">Not sure which mood fits?</h3>
                <p className="mt-2 text-[15px] leading-6 text-navy-muted">
                  Describe how you&apos;re feeling and our AI mood assistant will suggest a mood and feelings for you to review.
                </p>
                {aiStatus === "unavailable" ? (
                  <p className="mt-3 text-[14px] leading-5 text-navy-muted">AI mood assistance isn&apos;t available right now. You can still choose your mood and feelings yourself.</p>
                ) : aiQuotaRemaining === 0 ? (
                  <div className="mt-3 text-[14px] leading-5 text-navy-muted">
                    <p className="font-semibold text-navy">AI mood assistance will be back tomorrow.</p>
                    <p>You&apos;ve reached today&apos;s limit, but you can still choose your mood and feelings yourself.</p>
                  </div>
                ) : (
                  <>
                    <AiQuotaNotice remaining={aiQuotaRemaining} className="mt-3" />
                    <button
                      type="button"
                      className="mt-4 min-h-11 rounded-xl border border-brand px-4 py-2 text-[15px] font-semibold text-brand outline-none hover:bg-brand/5 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                      onClick={startAssistance}
                    >Help me identify my mood</button>
                  </>
                )}
              </section>
            </>
          )}

          {step === "feelings" && (
            <FeelingSelector feelings={draft.feelings} onToggle={toggleFeeling} heading="How did you feel?" headingRef={stepHeadingRef} errorId={error ? `${titleId}-error` : undefined} />
          )}

          {step === "reflection" && (
            <div>
              <label
                ref={(element) => { stepHeadingRef.current = element; }}
                tabIndex={-1}
                htmlFor={`${titleId}-journal`}
                className="block text-[28px] font-bold leading-[38px] outline-none sm:text-[32px] sm:leading-[45px]"
              >Write about your day...</label>
              {isAssisted && <p className="mt-2 text-[15px] leading-6 text-navy-muted">Describe how you&apos;re feeling. You&apos;ll review any suggested mood and feelings before saving.</p>}
              <textarea
                id={`${titleId}-journal`}
                aria-describedby={`${titleId}-count${error ? ` ${titleId}-error` : ""}`}
                value={draft.journalEntry}
                maxLength={JOURNAL_LIMIT}
                placeholder="Today, I felt..."
                className="mt-8 h-[150px] w-full resize-none rounded-xl border border-navy-muted bg-white p-4 text-[18px] leading-6 outline-none placeholder:text-navy-muted focus:border-brand focus:ring-1 focus:ring-brand"
                onChange={(event) => { setDraft((current) => ({ ...current, journalEntry: event.target.value })); setError(""); setAiMessage(""); }}
              />
              <p id={`${titleId}-count`} className="mt-2 text-right text-[12px] text-navy-muted">{draft.journalEntry.length}/{JOURNAL_LIMIT}</p>
              {aiMessage && <p role="status" className="mt-3 text-[14px] leading-5 text-navy-muted">{aiMessage}</p>}
              {isAssisted && aiStatus === "available" && <AiQuotaNotice remaining={aiQuotaRemaining} className="mt-3" />}
              {isAssisted && !hasValidSuggestion && (
                <button
                  type="button"
                  disabled={isInferring}
                  className="mt-4 text-[14px] font-semibold text-brand outline-none hover:underline focus-visible:ring-2 focus-visible:ring-brand"
                  onClick={returnToManual}
                >Choose mood manually</button>
              )}
            </div>
          )}

          {step === "review" && (
            <div aria-labelledby={`${titleId}-review-heading`}>
              <h3
                id={`${titleId}-review-heading`}
                ref={(element) => { stepHeadingRef.current = element; }}
                tabIndex={-1}
                className="text-[28px] font-bold leading-[38px] outline-none sm:text-[32px] sm:leading-[45px]"
              >Here&apos;s what your check-in suggests</h3>
              <p className="mt-2 text-[15px] leading-6 text-navy-muted">Review and change these suggestions before continuing.</p>
              <div className="mt-8">
                <MoodSelector mood={draft.mood} onChange={(mood) => { setDraft((current) => ({ ...current, mood })); setError(""); }} compact legend="Suggested mood" errorId={error ? `${titleId}-error` : undefined} />
              </div>
              <div className="mt-8">
                <FeelingSelector feelings={draft.feelings} onToggle={toggleFeeling} heading="Suggested feelings" errorId={error ? `${titleId}-error` : undefined} />
              </div>
              <div className="mt-6 border-t border-blue-100 pt-5">
                <p className="text-[14px] leading-5 text-navy-muted">
                  {hasUsedRetry || inferenceAttempts >= MAX_INFERENCE_ATTEMPTS_PER_SESSION
                    ? "You can still change anything above before continuing."
                    : "Not quite right? You can change anything above or try one more suggestion."}
                </p>
                {aiMessage && <p role="status" className="mt-3 text-[14px] leading-5 text-navy-muted">{aiMessage}</p>}
                {aiStatus === "available" && <AiQuotaNotice remaining={aiQuotaRemaining} className="mt-3" />}
                {aiStatus === "available" && aiQuotaRemaining === 0 && (
                  <div className="mt-3 text-[13px] leading-5 text-navy-muted">
                    <p className="font-semibold text-navy">AI mood assistance will be back tomorrow.</p>
                    <p>You&apos;ve reached today&apos;s limit, but you can still choose your mood and feelings yourself.</p>
                  </div>
                )}
                {(isInferring || (!hasUsedRetry && inferenceAttempts < MAX_INFERENCE_ATTEMPTS_PER_SESSION)) && aiQuotaRemaining > 0 && aiStatus === "available" && (
                  <button
                    type="button"
                    aria-busy={isInferring}
                    disabled={isInferring}
                    className="mt-3 min-h-11 text-[14px] font-semibold text-brand outline-none hover:underline focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50 disabled:no-underline"
                    onClick={() => void retryInference()}
                  >{isInferring ? "Finding another suggestion..." : "Try another suggestion"}</button>
                )}
              </div>
            </div>
          )}

          {step === "sleep" && (
            <fieldset aria-describedby={error ? `${titleId}-error` : undefined}>
              <legend
                ref={(element) => { stepHeadingRef.current = element; }}
                tabIndex={-1}
                className="mb-8 max-w-[500px] text-[28px] font-bold leading-[38px] outline-none sm:text-[32px] sm:leading-[45px]"
              >How many hours did you sleep today?</legend>
              <div className="grid gap-3">
                {sleepRanges.map((sleepHours) => (
                  <label key={sleepHours} className={optionClass(draft.sleepHours === sleepHours)}>
                    <input type="radio" name="sleep" value={sleepHours} checked={draft.sleepHours === sleepHours} onChange={() => { setDraft((current) => ({ ...current, sleepHours })); setError(""); }} className="size-5 accent-brand" />
                    <span className="text-[20px] font-semibold">{sleepLabels[sleepHours].toLowerCase()}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
        </div>

        <div className="mt-8">
          {error && <p id={`${titleId}-error`} role="alert" className="mb-3 text-[14px] font-medium text-red-600">{error}</p>}
          {isAssisted && (step === "review" || step === "sleep") && (
            <button type="button" disabled={isBusy} className="mb-3 h-11 w-full rounded-xl border border-brand font-semibold text-brand outline-none hover:bg-brand/5 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2" onClick={back}>Back</button>
          )}
          <button
            type="button"
            aria-busy={isBusy}
            disabled={isBusy || (step === "reflection" && isAssisted && !hasValidSuggestion && (hasRequestedInference || inferenceAttempts >= MAX_INFERENCE_ATTEMPTS_PER_SESSION))}
            className="h-[60px] w-full rounded-xl bg-brand text-[20px] font-semibold text-white outline-none hover:bg-[#3451c7] focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:opacity-60"
            onClick={step === "sleep" ? submit : step === "review" ? confirmReview : step === "reflection" && isAssisted ? hasValidSuggestion ? returnToReview : requestInference : advanceManual}
          >
            {step === "sleep"
              ? isSubmitting ? "Saving..." : "Submit"
              : step === "reflection" && isAssisted
                ? hasValidSuggestion
                  ? "Return to suggestion"
                  : isInferring
                    ? "Finding a mood that fits..."
                    : hasRequestedInference || inferenceAttempts >= MAX_INFERENCE_ATTEMPTS_PER_SESSION
                      ? "AI assistance unavailable"
                      : "Find a mood that fits"
                : "Continue"}
          </button>
        </div>
      </div>
    </dialog>
  );
}

function MoodSelector({ mood, onChange, errorId, legend = "How was your mood today?", compact = false }: {
  mood: MockMood | null;
  onChange: (mood: MockMood) => void;
  errorId?: string;
  legend?: string;
  compact?: boolean;
}) {
  return (
    <fieldset aria-describedby={errorId}>
      <legend className={`${compact ? "mb-4 text-[20px]" : "mb-8 text-[28px] leading-[38px] sm:text-[32px] sm:leading-[45px]"} font-bold`}>{legend}</legend>
      <div className="grid gap-3">
        {moods.map((value) => (
          <label key={value} className={optionClass(mood === value)}>
            <input type="radio" name="mood" value={value} checked={mood === value} onChange={() => onChange(value)} className="size-5 accent-brand" />
            <span className="text-[20px] font-semibold">{moodLabels[value]}</span>
            <Image src={`/images/icon-${moodIconNames[value]}-color.svg`} alt="" width={38} height={38} className="ml-auto" />
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function FeelingSelector({ feelings, onToggle, heading, headingRef, errorId }: {
  feelings: Feeling[];
  onToggle: (feeling: Feeling) => void;
  heading: string;
  headingRef?: RefObject<HTMLElement | null>;
  errorId?: string;
}) {
  return (
    <fieldset aria-describedby={errorId}>
      <legend ref={(element) => { if (headingRef) headingRef.current = element; }} tabIndex={headingRef ? -1 : undefined} className="text-[20px] font-bold leading-7 outline-none sm:text-[22px]">{heading}</legend>
      <p className="mt-1 text-[16px] leading-[22px] text-navy-muted">Select up to three tags:</p>
      <div className="mt-5 flex flex-wrap gap-3">
        {FEELINGS.map((feeling) => {
          const selected = feelings.includes(feeling);
          return (
            <label key={feeling} className={`${optionClass(selected)} w-auto gap-2 px-4 py-3`}>
              <input type="checkbox" checked={selected} onChange={() => onToggle(feeling)} className="size-4 accent-brand" />
              <span className="text-[18px] leading-6">{feeling}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function optionClass(selected: boolean) {
  return `flex min-h-[60px] cursor-pointer items-center gap-3 rounded-xl border-2 bg-white px-5 py-2 outline-none transition-colors focus-within:ring-2 focus-within:ring-brand focus-within:ring-offset-2 ${selected ? "border-brand" : "border-blue-100 hover:border-brand/60"}`;
}
