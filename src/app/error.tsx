"use client";

import { useEffect } from "react";

export default function Error({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    console.error("Unhandled application error:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center px-4 text-center">
      <div>
        <h1 className="text-2xl font-bold text-navy">Something went wrong</h1>
        <p className="mt-2 text-navy-muted">
          We couldn&apos;t load your account. Please try again.
        </p>
      </div>
    </main>
  );
}
