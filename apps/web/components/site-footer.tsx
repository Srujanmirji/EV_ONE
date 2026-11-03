import Link from "next/link";
import { sections } from "@/lib/site";
import { PREVIEW_DISCLOSURE } from "@/lib/site-metadata";

export function SiteFooter() {
  return (
    <footer className="bg-graphite text-paper">
      <div className="mx-auto grid w-full max-w-content gap-10 px-4 py-14 sm:px-8 md:grid-cols-[1fr_2fr]">
        <div className="flex flex-col gap-4">
          <Link
            href="/"
            className="w-fit font-display text-xl font-bold tracking-widest"
          >
            EVONE
          </Link>
          <p className="max-w-prose text-base text-titanium">
            EVONE is taking shape. {PREVIEW_DISCLOSURE}
          </p>
        </div>
        <nav aria-label="Footer">
          <ul className="grid grid-cols-1 gap-x-8 gap-y-1 sm:grid-cols-2">
            {sections.map((section) => (
              <li key={section.href}>
                <Link
                  href={section.href}
                  className="inline-flex min-h-11 items-center text-titanium underline-offset-4 hover:text-paper hover:underline"
                >
                  {section.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
