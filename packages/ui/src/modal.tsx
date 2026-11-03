"use client";

import { type ReactNode, useEffect, useId, useRef } from "react";
import { buttonClasses } from "./button";

const FOCUSABLE =
  'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';

export interface ModalProps {
  open: boolean;
  /** Called on Escape, the close button, or a backdrop click. */
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  /** Buttons for the footer; the first focusable element receives focus. */
  actions?: ReactNode;
  closeLabel?: string;
}

/**
 * Native <dialog> shown with showModal(): the browser makes the rest of the
 * page inert, keeps focus inside, and closes on Escape. On close, focus
 * returns to whatever opened it.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  actions,
  closeLabel = "Close",
}: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<Element | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      opener.current = document.activeElement;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const onDialogClose = () => {
      if (opener.current instanceof HTMLElement) opener.current.focus();
      opener.current = null;
    };
    // Escape fires "cancel"; keep React state the source of truth.
    const onCancel = (event: Event) => {
      event.preventDefault();
      onClose();
    };
    dialog.addEventListener("close", onDialogClose);
    dialog.addEventListener("cancel", onCancel);
    return () => {
      dialog.removeEventListener("close", onDialogClose);
      dialog.removeEventListener("cancel", onCancel);
    };
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onKeyDown={(event) => {
        // Keep Tab cycling inside the dialog (WAI-ARIA dialog pattern);
        // native modal dialogs otherwise let focus leave to browser UI.
        if (event.key !== "Tab" || !ref.current) return;
        const focusable = Array.from(
          ref.current.querySelectorAll<HTMLElement>(FOCUSABLE),
        ).filter((el) => !el.hasAttribute("disabled"));
        const first = focusable[0];
        const last = focusable.at(-1);
        if (!first || !last) return;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }}
      onClick={(event) => {
        // A click on the backdrop targets the dialog element itself.
        if (event.target === ref.current) onClose();
      }}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-card bg-paper p-0 text-ink shadow-xl backdrop:bg-ink/60"
    >
      <div className="flex flex-col gap-4 p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="font-display text-xl font-semibold">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className={buttonClasses("ghost", "md", "-mt-2 -mr-2")}
          >
            {closeLabel}
          </button>
        </div>
        {description ? (
          <p id={descriptionId} className="text-secondary">
            {description}
          </p>
        ) : null}
        {children}
        {actions ? (
          <div className="flex flex-wrap justify-end gap-3 pt-2">{actions}</div>
        ) : null}
      </div>
    </dialog>
  );
}
