import Image from "next/image";

export function SiteHeader() {
  return (
    <header className="flex h-[120px] items-start justify-between pt-8 sm:h-[128px] sm:pt-10 lg:h-[144px]">
      <Image
        src="/images/logo.svg"
        alt="Mood tracker"
        width={178}
        height={40}
        priority
      />

      <button
        type="button"
        aria-label="Open profile menu"
        className="flex h-10 items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-4 focus-visible:ring-offset-[#f5f5ff]"
      >
        <Image
          src="/images/avatar-lisa.jpg"
          alt="Lisa's profile"
          width={40}
          height={40}
          className="size-10 rounded-full object-cover"
        />
        <Image
          src="/images/icon-dropdown-arrow.svg"
          alt=""
          width={12}
          height={7}
        />
      </button>
    </header>
  );
}
