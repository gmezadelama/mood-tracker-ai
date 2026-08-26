import { Dashboard } from "@/components/mood/dashboard";
import { SiteHeader } from "@/components/site-header";

export function HomeView({ displayName }: { displayName: string }) {
  return (
    <main className="min-h-screen overflow-hidden px-4 pb-16 sm:px-8 sm:pb-20">
      <div className="mx-auto w-full max-w-[1170px]">
        <SiteHeader />
        <Dashboard displayName={displayName} />
      </div>
    </main>
  );
}
