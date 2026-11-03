"use client";

import { buttonClasses } from "@evone/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { primaryNav, SELL_SECTION } from "@/lib/site";

function isCurrent(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const current = isCurrent(pathname, href);
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm font-medium transition-colors motion-reduce:transition-none ${
        current ? "bg-ink text-paper" : "text-ink hover:bg-mist"
      }`}
    >
      {children}
    </Link>
  );
}

/** Below the lg breakpoint: a disclosure menu with every primary section. */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close when the route changes (a link was followed).
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const items = [...primaryNav, SELL_SECTION];
  return (
    <div className="lg:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className={buttonClasses("secondary", "md", "min-w-11")}
      >
        {open ? "Close" : "Menu"}
      </button>
      <nav
        id={panelId}
        aria-label="Main"
        hidden={!open}
        className="absolute inset-x-0 top-full border-b border-line bg-pearl px-4 pb-6 shadow-sm sm:px-8"
      >
        <ul className="mx-auto flex max-w-content flex-col gap-1 pt-2">
          {items.map((section) => {
            const current = isCurrent(pathname, section.href);
            return (
              <li key={section.href}>
                <Link
                  href={section.href}
                  aria-current={current ? "page" : undefined}
                  className={`flex min-h-12 items-center rounded-2xl px-4 text-base font-medium ${
                    current ? "bg-ink text-paper" : "hover:bg-mist"
                  }`}
                >
                  {section.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
