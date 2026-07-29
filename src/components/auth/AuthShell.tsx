import Link from "next/link";

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  /** Replaces the default left branding panel when provided. */
  aside?: React.ReactNode;
};

function DefaultAside() {
  return (
    <>
      <div className="animate-rise">
        <Link
          href="/login"
          className="font-[family-name:var(--font-fraunces)] text-4xl tracking-tight text-[var(--ink)] transition-opacity hover:opacity-80 sm:text-5xl"
        >
          ReliefNet
        </Link>
        <p className="mt-3 max-w-sm text-sm uppercase tracking-[0.18em] text-[var(--ink-muted)]">
          Disaster management operations
        </p>
      </div>

      <div className="relative my-12 animate-rise-delay lg:my-0">
        <div className="animate-drift absolute -left-6 top-8 h-40 w-40 rounded-full bg-[var(--accent-soft)] blur-2xl" />
        <div className="animate-drift absolute right-8 top-0 h-28 w-28 rounded-full bg-[#cfe4ef] blur-2xl [animation-delay:1.2s]" />
        <h1 className="relative font-[family-name:var(--font-fraunces)] text-4xl leading-tight tracking-tight sm:text-5xl lg:text-6xl">
          Coordinate response.
          <span className="mt-2 block text-[var(--accent)]">Stay ready.</span>
        </h1>
        <p className="relative mt-6 max-w-md text-base leading-relaxed text-[var(--ink-muted)] sm:text-lg">
          Secure access for teams managing alerts, shelters, and field operations.
        </p>
        <div className="animate-pulse-line relative mt-10 h-px w-40 bg-[var(--accent)]" />
      </div>

      <p className="hidden text-sm text-[var(--ink-muted)] lg:block">
        Built for continuity when every minute counts.
      </p>
    </>
  );
}

export function AuthShell({ title, subtitle, children, aside }: AuthShellProps) {
  return (
    <main className="relative flex min-h-screen flex-col lg:flex-row">
      <section className="relative flex flex-1 flex-col justify-between overflow-hidden px-8 py-10 text-[var(--ink)] lg:max-w-[48%] lg:px-14 lg:py-14">
        {aside ?? <DefaultAside />}
      </section>

      <section className="flex flex-1 items-center justify-center px-6 py-10 lg:px-12">
        <div className="animate-rise w-full max-w-md rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-8 shadow-[var(--shadow)] backdrop-blur-md">
          <h2 className="font-[family-name:var(--font-fraunces)] text-3xl tracking-tight text-[var(--ink)]">
            {title}
          </h2>
          <p className="mt-2 text-[var(--ink-muted)]">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </section>
    </main>
  );
}
