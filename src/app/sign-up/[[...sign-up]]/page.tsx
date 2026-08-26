import { SignUp } from "@clerk/nextjs";

import { authAppearance } from "@/components/auth-appearance";

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-16">
      <SignUp
        path="/sign-up"
        routing="path"
        signInUrl="/sign-in"
        fallbackRedirectUrl="/"
        appearance={authAppearance}
      />
    </main>
  );
}
