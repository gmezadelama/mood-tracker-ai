export function AiQuotaNotice({ remaining, className = "" }: { remaining: number; className?: string }) {
  if (remaining < 1 || remaining > 2) return null;

  return (
    <div className={`text-[13px] leading-5 text-navy-muted ${className}`}>
      <p className="font-semibold text-navy">
        {remaining} AI {remaining === 1 ? "request" : "requests"} left today.
      </p>
      <p>AI assistance resets tomorrow.</p>
    </div>
  );
}
