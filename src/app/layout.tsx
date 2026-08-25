import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const redditSans = localFont({
  src: [
    {
      path: "../../public/fonts/reddit-sans/RedditSans-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/reddit-sans/RedditSans-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/fonts/reddit-sans/RedditSans-SemiBold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../public/fonts/reddit-sans/RedditSans-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-reddit-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mood tracker",
  description: "Track your mood, sleep, and daily reflections.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${redditSans.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
