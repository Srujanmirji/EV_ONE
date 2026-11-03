export default function PreviewPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="mx-auto flex w-full max-w-content items-center justify-between gap-6 px-4 py-6 sm:px-8">
        <span className="font-display text-2xl font-bold tracking-widest">
          EVONE
        </span>
        <span className="text-sm text-secondary">Early preview</span>
      </header>

      <main
        id="main"
        tabIndex={-1}
        className="flex flex-1 items-center bg-graphite text-paper"
      >
        <div className="mx-auto w-full max-w-content px-4 py-24 sm:px-8 sm:py-32">
          <h1 className="max-w-3xl font-display text-display font-semibold text-balance">
            Everything EV.
            <br />
            One considered experience.
          </h1>
          <p className="mt-8 max-w-prose text-base text-titanium sm:text-lg">
            A place to discover electric vehicles and make informed ownership
            decisions. Built for India.
          </p>
        </div>
      </main>

      <footer className="mx-auto w-full max-w-content px-4 py-8 sm:px-8 sm:py-12">
        <p className="max-w-prose text-base text-secondary">
          EVONE is taking shape. Vehicle discovery and transactions are not
          available yet.
        </p>
      </footer>
    </div>
  );
}
