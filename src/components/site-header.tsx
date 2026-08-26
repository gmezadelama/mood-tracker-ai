import { UserButton } from "@clerk/nextjs";
import Image from "next/image";

export function SiteHeader() {
  return (
    <header className="flex h-[120px] items-center justify-between pt-8 sm:h-[128px] sm:pt-10 lg:h-[144px]">
      <Image
        src="/images/logo.svg"
        alt="Mood tracker"
        width={178}
        height={40}
        priority
      />

      <UserButton
        appearance={{
          elements: {
            avatarBox: "size-10",
          },
        }}
      />
    </header>
  );
}
