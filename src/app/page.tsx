import { redirect } from "next/navigation";

import { HomeView } from "@/components/home-view";
import { UnauthenticatedError } from "@/server/errors";
import { getCurrentUser } from "@/server/current-user";

export default async function HomePage() {
  let user;
  try {
    user = await getCurrentUser();
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      // Defensive fallback; proxy.ts already protects this route.
      redirect("/sign-in");
    }
    throw error;
  }

  return <HomeView displayName={user.displayName} />;
}
