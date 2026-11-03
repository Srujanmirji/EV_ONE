"use client";

import {
  Button,
  buttonClasses,
  Card,
  Checkbox,
  EmptyState,
  ErrorState,
  Gallery,
  Modal,
  SelectField,
  Skeleton,
  TextField,
} from "@evone/ui";
import { type FormEvent, useRef, useState } from "react";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={`kit-${title}`} className="flex flex-col gap-6">
      <h2 id={`kit-${title}`} className="font-display text-2xl font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

function FormDemo() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const next: Record<string, string> = {};
    if (!String(data.get("city") ?? "").trim())
      next.city = "Enter the city where the vehicle is.";
    if (!data.get("type")) next.type = "Choose a vehicle type.";
    setErrors(next);
    setSaved(false);
    if (Object.keys(next).length > 0) {
      // Move focus to the first invalid field so its error is read out.
      // Select by name: aria-invalid is not in the DOM until React re-renders.
      const first = Object.keys(next)[0];
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
    }, 400);
  }

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={onSubmit}
      className="grid max-w-xl gap-5"
    >
      <TextField
        name="city"
        label="City"
        hint="Example form only; nothing is sent."
        required
        error={errors.city}
      />
      <SelectField
        name="type"
        label="Vehicle type"
        required
        error={errors.type}
        defaultValue=""
      >
        <option value="" disabled>
          Select a type
        </option>
        <option value="SCOOTER">Scooter</option>
        <option value="CAR">Car</option>
      </SelectField>
      <Checkbox
        name="updates"
        label="Email me when this opens"
        hint="Unchecked by default."
      />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" loading={saving} loadingLabel="Checking…">
          Check form
        </Button>
        <Button type="reset" variant="secondary" onClick={() => setErrors({})}>
          Reset
        </Button>
      </div>
      {saved ? (
        <p role="status" className="font-medium text-success">
          Form is valid. Nothing was sent.
        </p>
      ) : null}
    </form>
  );
}

export function UiKit() {
  const [open, setOpen] = useState(false);
  return (
    <main id="main" tabIndex={-1} className="flex-1">
      <div className="mx-auto flex w-full max-w-content flex-col gap-16 px-4 py-14 sm:px-8">
        <header className="flex flex-col gap-3">
          <p className="text-sm font-semibold tracking-widest text-secondary uppercase">
            Internal
          </p>
          <h1 className="font-display text-4xl font-semibold">
            Component reference
          </h1>
          <p className="max-w-prose text-secondary">
            Shared components from <code>@evone/ui</code> in their states.
            Example content only.
          </p>
        </header>

        <Section title="Buttons">
          <div className="flex flex-wrap items-center gap-3">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button size="lg">Large</Button>
            <Button disabled>Disabled</Button>
            <Button loading loadingLabel="Saving…">
              Save
            </Button>
            <a href="#kit-Buttons" className={buttonClasses("secondary")}>
              Link styled as button
            </a>
          </div>
          <div className="flex flex-wrap gap-3 rounded-card bg-graphite p-6">
            <Button variant="on-dark">On dark</Button>
          </div>
        </Section>

        <Section title="Form fields">
          <FormDemo />
        </Section>

        <Section title="Cards">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <h3 className="font-display text-lg font-semibold">Paper</h3>
              <p className="mt-2 text-secondary">Default surface on pearl.</p>
            </Card>
            <Card tone="mist">
              <h3 className="font-display text-lg font-semibold">Mist</h3>
              <p className="mt-2 text-secondary">Alternating surface.</p>
            </Card>
            <Card tone="dark">
              <h3 className="font-display text-lg font-semibold">Dark</h3>
              <p className="mt-2 text-titanium">Cinematic panel.</p>
            </Card>
          </div>
        </Section>

        <Section title="States">
          <div className="grid gap-4 md:grid-cols-3">
            <EmptyState
              title="No vehicles match"
              headingLevel={3}
              action={<Button variant="secondary">Reset filters</Button>}
            >
              Try removing a filter.
            </EmptyState>
            <ErrorState
              title="Could not load vehicles"
              headingLevel={3}
              action={<Button>Try again</Button>}
            >
              Check your connection and try again.
            </ErrorState>
            <Card>
              <Skeleton label="Loading example" lines={4} />
            </Card>
          </div>
        </Section>

        <Section title="Gallery">
          <div className="grid gap-6 lg:grid-cols-2">
            <Gallery
              label="Example gallery"
              images={[1, 2, 3].map((n) => ({
                src: `/kit/photo-${n}.svg`,
                alt: `Example image ${n}, an abstract circle`,
                width: 1600,
                height: 900,
              }))}
            />
            <Gallery
              label="Example empty gallery"
              images={[]}
              emptyText="No photos yet."
            />
          </div>
        </Section>

        <Section title="Modal">
          <div>
            <Button onClick={() => setOpen(true)}>Open example dialog</Button>
          </div>
          <Modal
            open={open}
            onClose={() => setOpen(false)}
            title="Example dialog"
            description="Focus stays inside until you close it. Escape, the close button or a click outside closes it."
            actions={
              <>
                <Button variant="secondary" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setOpen(false)}>Confirm</Button>
              </>
            }
          />
        </Section>
      </div>
    </main>
  );
}
