import { SignIn } from "@clerk/nextjs";

import { authAppearance } from "@/components/auth-appearance";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-16">
      <SignIn
        path="/sign-in"
        routing="path"
        signUpUrl="/sign-up"
        fallbackRedirectUrl="/"
        appearance={authAppearance}
      />
    </main>
  );
}
