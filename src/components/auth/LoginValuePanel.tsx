import Link from "next/link";

const UNLOCK_POINTS = [
  {
    title: "Claim Village Aid Routes",
    description:
      "Signal en-route supplies so other teams don’t duplicate efforts.",
  },
  {
    title: "Register Boats & Transport",
    description:
      "Connect with ground leads to dispatch emergency fleet vehicles.",
  },
  {
    title: "Access Verified Ground Contacts",
    description:
      "View direct phone numbers for highland shelter managers and village leads.",
  },
] as const;

export function LoginValuePanel() {
  return (
    <>
      <div className="animate-rise">
        <Link
          href="/login"
          className="font-[family-name:var(--font-fraunces)] text-3xl tracking-tight text-[var(--ink)] transition-opacity hover:opacity-80 sm:text-4xl"
        >
          ReliefNet
        </Link>
        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/25 bg-[var(--accent-soft)]/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent-strong)]">
          <span
            className="relative flex h-2 w-2"
            aria-hidden="true"
          >
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--accent)]" />
          </span>
          Live Coordination Across Assam
        </div>
      </div>

      <div className="relative my-10 animate-rise-delay lg:my-0">
        <div className="animate-drift absolute -left-6 top-4 h-36 w-36 rounded-full bg-[var(--accent-soft)] blur-2xl" />
        <div className="animate-drift absolute right-4 top-0 h-24 w-24 rounded-full bg-[#cfe4ef] blur-2xl [animation-delay:1.2s]" />

        <h1 className="relative font-[family-name:var(--font-fraunces)] text-4xl leading-tight tracking-tight sm:text-5xl lg:text-[3.25rem]">
          Turn Information Into{" "}
          <span className="text-[var(--accent)]">Direct Action</span>
        </h1>
        <p className="relative mt-5 max-w-md text-base leading-relaxed text-[var(--ink-muted)] sm:text-lg">
          Viewing flood data is only the first step. Sign in to unlock active
          relief coordination — claim routes, register transport, and reach
          verified ground contacts.
        </p>

        <ul className="relative mt-8 space-y-5">
          {UNLOCK_POINTS.map((point, index) => (
            <li key={point.title} className="flex gap-3">
              <span
                className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-semibold text-white"
                aria-hidden="true"
              >
                {index + 1}
              </span>
              <div>
                <p className="font-semibold text-[var(--ink)]">{point.title}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-[var(--ink-muted)]">
                  {point.description}
                </p>
              </div>
            </li>
          ))}
        </ul>

        <div className="animate-pulse-line relative mt-8 h-px w-40 bg-[var(--accent)]" />
      </div>

      <p className="text-sm leading-relaxed text-[var(--ink-muted)]">
        Personal contact details are protected and only shared during active
        dispatch.
      </p>
    </>
  );
}
