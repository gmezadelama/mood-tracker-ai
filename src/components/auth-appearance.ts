// Matches the dashboard's design tokens (src/app/globals.css) so Clerk's
// components read as part of the product rather than a generic Clerk page.
export const authAppearance = {
  variables: {
    colorPrimary: "#4865db",
    colorForeground: "#21214d",
    colorMutedForeground: "#57577b",
    colorBackground: "#ffffff",
    colorBorder: "#e0e6fa",
    colorInput: "#ffffff",
    colorInputForeground: "#21214d",
    colorDanger: "#dc2626",
    fontFamily: "var(--font-reddit-sans), ui-sans-serif, system-ui, sans-serif",
    borderRadius: "1rem",
  },
  elements: {
    rootBox: "w-full max-w-[400px]",
    card: "shadow-[0_0_20px_rgba(1,5,39,0.08)] border border-blue-100 rounded-2xl p-6 sm:p-8",
    headerTitle: "text-navy text-[28px] font-bold",
    headerSubtitle: "text-navy-muted",
    formButtonPrimary:
      "bg-brand hover:bg-[#3451c7] text-white font-semibold normal-case shadow-none",
    footerActionLink: "text-brand font-semibold hover:text-[#3451c7]",
    formFieldLabel: "text-navy font-medium",
    formFieldInput: "border-blue-100 focus:border-brand focus:ring-1 focus:ring-brand",
  },
};
