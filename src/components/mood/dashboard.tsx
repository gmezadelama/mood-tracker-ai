"use client";

import Image from "next/image";
import { useState } from "react";

import { MoodLogDialog } from "./mood-log-dialog";
import { MoodTrendChart } from "./mood-trend-chart";
import {
  calculateMockAverages,
  mockAverages,
  moodIconNames,
  moodLabels,
  moodQuotes,
  recentEntries,
  sleepLabels,
  type MockAverage,
  type MockMoodEntry,
} from "./mock-data";

const cardClass = "rounded-2xl border border-blue-100 bg-white";
// The mock session follows the calendar day shown by the supplied design.
const today = "2025-04-16";

export function Dashboard({ displayName }: { displayName: string }) {
  const [entries, setEntries] = useState<MockMoodEntry[]>(() => [...recentEntries]);
  const [currentEntry, setCurrentEntry] = useState<MockMoodEntry | null>(null);
  const [isLogging, setIsLogging] = useState(false);
  const averages = currentEntry ? calculateMockAverages(entries) : mockAverages;

  function logEntry(entry: MockMoodEntry) {
    const updatedEntries = [...entries.filter((item) => item.entryDate !== entry.entryDate), entry]
      .sort((left, right) => left.entryDate.localeCompare(right.entryDate))
      .slice(-11);
    setEntries(updatedEntries);
    setCurrentEntry(entry);
  }

  return (
    <div>
      <section className="text-center">
        <p className="text-[24px] font-bold leading-[36px] text-brand sm:text-[30px] sm:leading-[45px]">
          Hello, {displayName}!
        </p>
        <h1 className="mx-auto mt-4 max-w-[650px] text-[46px] font-bold leading-[1.18] tracking-[-2px] text-navy max-sm:text-[40px] max-sm:leading-[1.38] max-sm:tracking-[-1.2px] sm:mt-[10px] sm:leading-[73px] lg:text-[52px]">
          How are you feeling today?
        </h1>
        <p className="mt-4 text-[18px] leading-[22px] text-navy-muted sm:mt-[10px]">
          Wednesday, April 16th, 2025
        </p>
      </section>

      {currentEntry ? (
        <section aria-label="Today's mood" className="mt-12 grid gap-5 lg:mt-16 lg:grid-cols-[670px_1fr] lg:gap-8">
          <MoodCard entry={currentEntry} />
          <div className="grid gap-5 lg:grid-rows-[123px_197px]">
            <SleepCard entry={currentEntry} />
            <ReflectionCard entry={currentEntry} />
          </div>
        </section>
      ) : (
        <div className="mt-12 flex justify-center lg:mt-16">
          <button
            type="button"
            className="h-[60px] rounded-xl bg-brand px-8 text-[20px] font-semibold text-white outline-none hover:bg-[#3451c7] focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-4 focus-visible:ring-offset-[#f5f5ff]"
            onClick={() => setIsLogging(true)}
          >
            Log today&apos;s mood
          </button>
        </div>
      )}

      <section className={`${currentEntry ? "mt-8" : "mt-16"} grid gap-8 lg:grid-cols-[370px_1fr]`}>
        <AveragesCard averages={averages} />
        <MoodTrendChart entries={entries} />
      </section>

      {isLogging && !currentEntry && (
        <MoodLogDialog
          entryDate={today}
          onClose={() => setIsLogging(false)}
          onSubmit={logEntry}
        />
      )}
    </div>
  );
}

function MoodCard({ entry }: { entry: MockMoodEntry }) {
  return (
    <article className={`${cardClass} relative h-[507px] overflow-hidden shadow-[0_0_20px_rgba(1,5,39,0.08)] sm:h-[340px]`}>
      <div className="absolute left-4 top-8 z-10 text-left sm:left-8">
        <h2 className="text-[32px] font-bold leading-[45px] text-navy">I’m feeling</h2>
        <p className="text-[40px] font-bold leading-[48px] tracking-[-1.2px] text-navy">
          {moodLabels[entry.mood]}
        </p>
      </div>

      <div className="absolute left-1/2 top-[157px] size-[200px] -translate-x-1/2 sm:left-auto sm:right-10 sm:top-[50px] sm:size-[320px] sm:translate-x-0 lg:right-10">
        <Image
          src={`/images/icon-${moodIconNames[entry.mood]}-color.svg`}
          alt=""
          fill
          sizes="(max-width: 639px) 200px, 320px"
          priority
        />
      </div>

      <blockquote className="absolute bottom-8 left-4 right-4 text-center text-[18px] font-medium italic leading-[23px] text-navy sm:bottom-8 sm:left-8 sm:right-auto sm:w-[246px] sm:text-left">
        <Image
          src="/images/icon-quote.svg"
          alt=""
          width={24}
          height={24}
          className="mx-auto mb-4 sm:mx-0 sm:mb-3"
        />
        “{moodQuotes[entry.mood][0]}”
      </blockquote>
    </article>
  );
}

function SleepCard({ entry }: { entry: MockMoodEntry }) {
  return (
    <article className={`${cardClass} h-[123px] p-5`}>
      <div className="flex items-center gap-3 text-[18px] leading-[22px] text-navy-muted">
        <Image src="/images/icon-sleep.svg" alt="" width={22} height={22} />
        <h2>Sleep</h2>
      </div>
      <p className="mt-4 text-[32px] font-bold leading-[45px] text-navy">
        {sleepLabels[entry.sleepHours].toLowerCase()}
      </p>
    </article>
  );
}

function ReflectionCard({ entry }: { entry: MockMoodEntry }) {
  return (
    <article className={`${cardClass} flex h-[197px] flex-col p-5`}>
      <div className="flex items-center gap-3 text-[18px] leading-[22px] text-navy-muted">
        <Image src="/images/icon-reflection.svg" alt="" width={22} height={22} />
        <h2>Reflection of the day</h2>
      </div>
      <p className="mt-4 text-[18px] font-medium leading-[24px] text-navy">
        {entry.journalEntry}
      </p>
      <p className="mt-auto text-[18px] italic leading-[23px] text-navy-muted">
        {entry.feelings.map((feeling) => `#${feeling}`).join("  ")}
      </p>
    </article>
  );
}

function AveragesCard({ averages }: { averages: { mood: MockAverage; sleep: MockAverage } }) {
  return (
    <section aria-label="Mood and sleep averages" className={`${cardClass} h-[444px] p-4 sm:h-[452px] sm:p-6 lg:h-[453px]`}>
      <AverageBlock
        title="Average Mood"
        value={averages.mood.value}
        icon="/images/icon-neutral-white.svg"
        trendIcon={trendIcon(averages.mood.trend)}
        trend={trendCopy(averages.mood.trend)}
        background="#89caff"
        dark
      />
      <AverageBlock
        title="Average Sleep"
        value={averages.sleep.value}
        icon="/images/icon-sleep.svg"
        trendIcon={trendIcon(averages.sleep.trend)}
        trend={trendCopy(averages.sleep.trend)}
        background="#4865db"
      />
    </section>
  );
}

function trendIcon(trend: MockAverage["trend"]) {
  return `/images/icon-trend-${trend}.svg`;
}

function trendCopy(trend: MockAverage["trend"]) {
  const label = trend === "same" ? "Same as" : `${trend[0].toUpperCase()}${trend.slice(1)} from`;
  return `${label} the previous 5 check-ins`;
}

function AverageBlock({
  title,
  value,
  icon,
  trendIcon,
  trend,
  background,
  dark = false,
}: {
  title: string;
  value: string;
  icon: string;
  trendIcon: string;
  trend: string;
  background: string;
  dark?: boolean;
}) {
  return (
    <div className="mb-6 last:mb-0">
      <h2 className="text-[20px] font-semibold leading-7 text-navy">
        {title} <span className="text-[15px] font-normal text-navy-muted">(Last 5 check-ins)</span>
      </h2>
      <div
        className={`relative mt-3 h-[150px] overflow-hidden rounded-2xl px-4 py-[31px] sm:px-5 ${dark ? "text-navy" : "text-white"}`}
        style={{ backgroundColor: background }}
      >
        <Image
          src="/images/bg-pattern-averages.svg"
          alt=""
          width={243}
          height={251}
          className="absolute -right-[70px] -top-[48px] h-[251px] w-[243px]"
        />
        <div className="relative flex items-center gap-4">
          <Image
            src={icon}
            alt=""
            width={24}
            height={24}
            className={dark ? "" : "brightness-0 invert"}
          />
          <p className="text-[24px] font-semibold leading-[34px]">{value}</p>
        </div>
        <div className="relative mt-3 flex items-start gap-2 text-[15px] leading-[21px]">
          <Image
            src={trendIcon}
            alt=""
            width={16}
            height={16}
            className={dark ? "mt-0.5" : "mt-0.5 brightness-0 invert"}
          />
          <p>{trend}</p>
        </div>
      </div>
    </div>
  );
}
