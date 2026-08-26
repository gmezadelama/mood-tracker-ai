"use client";

import { useEffect, useRef } from "react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";

import {
  moodColors,
  moodIconNames,
  moodLabels,
  type MockMoodEntry,
  type MockSleepRange,
} from "./mock-data";

const sleepLevels: Record<MockSleepRange, number> = {
  1: 1,
  3.5: 2,
  5.5: 3,
  7.5: 4,
  9: 5,
};

const sleepLabels = ["", "0-2 hours", "3-4 hours", "5-6 hours", "7-8 hours", "9+ hours"];

interface ChartDatum extends MockMoodEntry {
  sleepLevel: number;
}

export function MoodTrendChart({ entries }: { entries: MockMoodEntry[] }) {
  const scrollRegionRef = useRef<HTMLDivElement>(null);
  const data: ChartDatum[] = entries.map((entry) => ({
    ...entry,
    sleepLevel: sleepLevels[entry.sleepHours],
  }));

  useEffect(() => {
    const region = scrollRegionRef.current;
    if (region) region.scrollLeft = region.scrollWidth;
  }, [entries.length]);

  return (
    <section className="h-[420px] min-w-0 rounded-2xl border border-blue-100 bg-white px-4 py-5 sm:h-[437px] sm:px-6 sm:py-6 lg:h-[453px] lg:px-8 lg:py-8">
      <h2 className="text-[28px] font-bold leading-9 tracking-[-0.8px] text-navy sm:text-[32px] sm:leading-[45px]">
        Mood and sleep trends
      </h2>

      {entries.length === 0 ? (
        <div className="grid h-[312px] place-items-center text-center text-[18px] text-navy-muted">
          <p>No check-ins yet. Log your first mood to start the trend chart.</p>
        </div>
      ) : (
        <div className="mt-8 flex h-[312px] min-w-0 sm:mt-8">
          <div aria-hidden="true" className="relative z-10 h-[264px] w-[68px] shrink-0 bg-white text-[12px] text-navy-muted">
            {[5, 4, 3, 2, 1].map((level, index) => (
              <div
                key={level}
                className="absolute left-0 flex h-[13px] items-center gap-1 whitespace-nowrap"
                style={{ top: index * 53 }}
              >
                <span className="w-3 text-[10px] font-bold">ᶻᶻ</span>
                <span>{sleepLabels[level]}</span>
              </div>
            ))}
          </div>

          <div className="relative min-w-0 flex-1">
            <div
              ref={scrollRegionRef}
              aria-label="Mood and sleep chart. Scroll horizontally to view earlier entries."
              className="h-[307px] overflow-x-auto overflow-y-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              role="region"
              tabIndex={0}
            >
              <div aria-hidden="true" className="h-[307px] w-[626px]">
                <BarChart width={626} height={307} data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <CartesianGrid
                horizontal
                vertical={false}
                stroke="#e0e6fa"
                strokeWidth={1}
              />
              <YAxis hide domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} />
              <XAxis
                dataKey="entryDate"
                axisLine={false}
                tickLine={false}
                height={43}
                interval={0}
                tick={<DateTick />}
              />
              <Tooltip cursor={false} content={ChartTooltip} />
              <Bar
                dataKey="sleepLevel"
                barSize={40}
                radius={[20, 20, 20, 20]}
                shape={<MoodBar />}
                isAnimationActive={false}
              />
                </BarChart>
              </div>
            </div>
            <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-white to-transparent lg:hidden" />
          </div>
        </div>
      )}

      <ul className="sr-only" aria-label="Recent mood and sleep history">
        {entries.map((entry) => (
          <li key={entry.id}>
            {formatAccessibleDate(entry.entryDate)}: {moodLabels[entry.mood]} mood and {sleepLabels[sleepLevels[entry.sleepHours]]} of sleep.
          </li>
        ))}
      </ul>
    </section>
  );
}

function MoodBar(props: unknown) {
  const { x, y, width, height, payload } = props as {
    x: number;
    y: number;
    width: number;
    height: number;
    payload: ChartDatum;
  };

  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={20} fill={moodColors[payload.mood]} />
      <image
        href={`/images/icon-${moodIconNames[payload.mood]}-white.svg`}
        x={x + 5}
        y={y + 35}
        width={30}
        height={30}
      />
    </g>
  );
}

function DateTick(props: unknown) {
  const { x, y, payload } = props as {
    x: number;
    y: number;
    payload: { value: string };
  };
  const date = new Date(`${payload.value}T00:00:00`);
  const month = date.toLocaleDateString("en-US", { month: "short" });

  return (
    <g transform={`translate(${x},${y + 10})`} fill="#57577b" fontSize={12} textAnchor="middle">
      <text>{month}</text>
      <text y={19}>{String(date.getDate()).padStart(2, "0")}</text>
    </g>
  );
}

function ChartTooltip({ active, payload }: TooltipContentProps) {
  const entry = payload?.[0]?.payload as ChartDatum | undefined;
  if (!active || !entry) return null;

  return (
    <div className="rounded-xl border border-blue-100 bg-white p-3 text-[14px] leading-5 text-navy shadow-lg">
      <p className="font-semibold">{formatAccessibleDate(entry.entryDate)}</p>
      <p>{moodLabels[entry.mood]} mood</p>
      <p>{sleepLabels[entry.sleepLevel]} of sleep</p>
    </div>
  );
}

function formatAccessibleDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
