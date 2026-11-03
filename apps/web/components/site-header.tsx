import Link from "next/link";
import { primaryNav, SELL_SECTION } from "@/lib/site";
import { MobileNav, NavLink } from "./nav-client";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-pearl/95 backdrop-blur supports-[backdrop-filter]:bg-pearl/80">
      <div className="mx-auto flex w-full max-w-content items-center justify-between gap-4 px-4 py-3 sm:px-8">
        <Link
          href="/"
          aria-label="EVONE home"
          className="inline-flex min-h-11 items-center font-display text-xl font-bold tracking-widest"
        >
          EVONE
        </Link>
        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {primaryNav.map((section) => (
              <li key={section.href}>
                <NavLink href={section.href}>{section.label}</NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href={SELL_SECTION.href}
            className="hidden min-h-11 items-center rounded-full bg-ink px-5 text-sm font-semibold text-paper sm:inline-flex"
          >
            {SELL_SECTION.label}
          </Link>
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
