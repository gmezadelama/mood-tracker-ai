"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";

import {
  FEELINGS,
  MAX_FEELINGS_PER_ENTRY,
  type Feeling,
} from "@/domain/mood/constants";

import {
  moodIconNames,
  moodLabels,
  sleepLabels,
  type MockMood,
  type MockMoodEntry,
  type MockSleepRange,
} from "./mock-data";

const JOURNAL_LIMIT = 150;
const moods: MockMood[] = [2, 1, 0, -1, -2];
const sleepRanges: MockSleepRange[] = [9, 7.5, 5.5, 3.5, 1];

interface Draft {
  mood: MockMood | null;
  feelings: Feeling[];
  journalEntry: string;
  sleepHours: MockSleepRange | null;
}

const initialDraft: Draft = {
  mood: null,
  feelings: [],
  journalEntry: "",
  sleepHours: null,
};

export function MoodLogDialog({
  entryDate,
  onClose,
  onSubmit,
}: {
  entryDate: string;
  onClose: () => void;
  onSubmit: (entry: MockMoodEntry) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const stepHeadingRef = useRef<HTMLElement>(null);
  const titleId = useId();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [error, setError] = useState("");

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
    if (step > 0) stepHeadingRef.current?.focus();
  }, [step]);

  function close() {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (typeof dialog.close === "function") dialog.close();
    else {
      dialog.removeAttribute("open");
      onClose();
    }
  }

  function advance() {
    if (step === 0 && draft.mood === null) {
      setError("Please select a mood before continuing.");
      return;
    }
    if (step === 1 && draft.feelings.length === 0) {
      setError("Please select at least one tag before continuing.");
      return;
    }
    if (step === 2 && draft.journalEntry.trim().length === 0) {
      setError("Please write a short reflection before continuing.");
      return;
    }
    setError("");
    setStep((current) => current + 1);
  }

  function submit() {
    if (draft.sleepHours === null || draft.mood === null) {
      setError("Please enter how many hours you slept.");
      return;
    }
    onSubmit({
      id: entryDate,
      entryDate,
      mood: draft.mood,
      feelings: draft.feelings,
      journalEntry: draft.journalEntry.trim(),
      sleepHours: draft.sleepHours,
    });
    close();
  }

  function toggleFeeling(feeling: Feeling) {
    if (draft.feelings.includes(feeling)) {
      setDraft((current) => ({
        ...current,
        feelings: current.feelings.filter((item) => item !== feeling),
      }));
      setError("");
      return;
    }
    if (draft.feelings.length === MAX_FEELINGS_PER_ENTRY) {
      setError("You can only select a maximum of 3 tags.");
      return;
    }
    setDraft((current) => ({
      ...current,
      feelings: [...current.feelings, feeling],
    }));
    setError("");
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className="m-0 h-dvh max-h-none w-dvw max-w-none overflow-y-auto rounded-none bg-[linear-gradient(180deg,#f5f5ff_73%,#e0e0ff_100%)] p-0 text-navy shadow-none outline-none backdrop:bg-navy/70 sm:m-auto sm:h-fit sm:max-h-[calc(100dvh-32px)] sm:w-[calc(100%-32px)] sm:max-w-[600px] sm:rounded-2xl sm:shadow-[0_20px_60px_rgba(33,33,77,0.3)]"
      tabIndex={-1}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClose={onClose}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          close();
        }
      }}
    >
      <div className="relative px-5 pb-8 pt-8 sm:px-10 sm:pb-12 sm:pt-12">
        <h2 id={titleId} className="text-[32px] font-bold leading-[45px] tracking-[-1px] sm:text-[40px] sm:leading-[48px]">
          Log your mood.
        </h2>
        <button
          type="button"
          aria-label="Close mood logging"
          className="fixed right-5 top-5 z-10 grid size-10 place-items-center rounded-full bg-[#f5f5ff]/95 text-[30px] leading-none text-navy-muted outline-none hover:bg-white/70 focus-visible:ring-2 focus-visible:ring-brand sm:absolute sm:right-6 sm:top-5 sm:bg-transparent"
          onClick={close}
        >
          ×
        </button>

        <div aria-label={`Step ${step + 1} of 4`} className="mt-8 grid grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((index) => (
            <span
              key={index}
              className={`h-1.5 rounded-full ${index <= step ? "bg-brand" : "bg-blue-100"}`}
            />
          ))}
        </div>

        <div className="mt-8">
          {step === 0 && (
            <fieldset aria-describedby={error ? `${titleId}-error` : undefined}>
              <legend className="mb-8 text-[28px] font-bold leading-[38px] sm:text-[32px] sm:leading-[45px]">
                How was your mood today?
              </legend>
              <div className="grid gap-3">
                {moods.map((mood) => (
                  <label key={mood} className={optionClass(draft.mood === mood)}>
                    <input
                      type="radio"
                      name="mood"
                      value={mood}
                      checked={draft.mood === mood}
                      onChange={() => {
                        setDraft((current) => ({ ...current, mood }));
                        setError("");
                      }}
                      className="size-5 accent-brand"
                    />
                    <span className="text-[20px] font-semibold">{moodLabels[mood]}</span>
                    <Image
                      src={`/images/icon-${moodIconNames[mood]}-color.svg`}
                      alt=""
                      width={38}
                      height={38}
                      className="ml-auto"
                    />
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {step === 1 && (
            <fieldset aria-describedby={error ? `${titleId}-error` : undefined}>
              <legend
                ref={(element) => { stepHeadingRef.current = element; }}
                tabIndex={-1}
                className="text-[28px] font-bold leading-[38px] outline-none sm:text-[32px] sm:leading-[45px]"
              >
                How did you feel?
              </legend>
              <p className="mt-1 text-[18px] leading-[22px] text-navy-muted">Select up to three tags:</p>
              <div className="mt-8 flex flex-wrap gap-3">
                {FEELINGS.map((feeling) => {
                  const selected = draft.feelings.includes(feeling);
                  return (
                    <label key={feeling} className={`${optionClass(selected)} w-auto gap-2 px-4 py-3`}>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleFeeling(feeling)}
                        className="size-4 accent-brand"
                      />
                      <span className="text-[18px] leading-6">{feeling}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}

          {step === 2 && (
            <div>
              <label
                ref={(element) => { stepHeadingRef.current = element; }}
                tabIndex={-1}
                htmlFor={`${titleId}-journal`}
                className="block text-[28px] font-bold leading-[38px] outline-none sm:text-[32px] sm:leading-[45px]"
              >
                Write about your day...
              </label>
              <textarea
                id={`${titleId}-journal`}
                aria-describedby={`${titleId}-count${error ? ` ${titleId}-error` : ""}`}
                value={draft.journalEntry}
                maxLength={JOURNAL_LIMIT}
                placeholder="Today, I felt..."
                className="mt-8 h-[150px] w-full resize-none rounded-xl border border-navy-muted bg-white p-4 text-[18px] leading-6 outline-none placeholder:text-navy-muted focus:border-brand focus:ring-1 focus:ring-brand"
                onChange={(event) => {
                  setDraft((current) => ({ ...current, journalEntry: event.target.value }));
                  setError("");
                }}
              />
              <p id={`${titleId}-count`} className="mt-2 text-right text-[12px] text-navy-muted">
                {draft.journalEntry.length}/{JOURNAL_LIMIT}
              </p>
            </div>
          )}

          {step === 3 && (
            <fieldset aria-describedby={error ? `${titleId}-error` : undefined}>
              <legend
                ref={(element) => { stepHeadingRef.current = element; }}
                tabIndex={-1}
                className="mb-8 max-w-[500px] text-[28px] font-bold leading-[38px] outline-none sm:text-[32px] sm:leading-[45px]"
              >
                How many hours did you sleep today?
              </legend>
              <div className="grid gap-3">
                {sleepRanges.map((sleepHours) => (
                  <label key={sleepHours} className={optionClass(draft.sleepHours === sleepHours)}>
                    <input
                      type="radio"
                      name="sleep"
                      value={sleepHours}
                      checked={draft.sleepHours === sleepHours}
                      onChange={() => {
                        setDraft((current) => ({ ...current, sleepHours }));
                        setError("");
                      }}
                      className="size-5 accent-brand"
                    />
                    <span className="text-[20px] font-semibold">{sleepLabels[sleepHours].toLowerCase()}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
        </div>

        <div className="mt-8">
          {error && (
            <p id={`${titleId}-error`} role="alert" className="mb-3 text-[14px] font-medium text-red-600">
              {error}
            </p>
          )}
          <button
            type="button"
            className="h-[60px] w-full rounded-xl bg-brand text-[20px] font-semibold text-white outline-none hover:bg-[#3451c7] focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            onClick={step === 3 ? submit : advance}
          >
            {step === 3 ? "Submit" : "Continue"}
          </button>
        </div>
      </div>
    </dialog>
  );
}

function optionClass(selected: boolean) {
  return `flex min-h-[60px] cursor-pointer items-center gap-3 rounded-xl border-2 bg-white px-5 py-2 outline-none transition-colors focus-within:ring-2 focus-within:ring-brand focus-within:ring-offset-2 ${
    selected ? "border-brand" : "border-blue-100 hover:border-brand/60"
  }`;
}
