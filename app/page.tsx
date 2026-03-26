const foundationItems = [
  "Scenario catalog -> article catalog -> practice stage",
  "Paragraph / sentence / token structured content",
  "GeneratedDraft lifecycle before promotion to ContentItem",
  "Instance-scoped progress with farthest paragraph tracking",
];

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-12">
      <section className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)]/90 p-8 shadow-[0_20px_80px_rgba(60,35,10,0.08)] backdrop-blur">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <p className="text-sm uppercase tracking-[0.2em] text-[var(--paragraph)]">
              spoke foundation
            </p>
            <h1 className="max-w-3xl text-5xl leading-tight font-semibold">
              A text-fragment-first English speaking practice workspace.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-black/70">
              This is the initial application shell for the OpenSpec foundation:
              Next.js, TypeScript, Tailwind CSS, and a data model centered on
              scenario-driven practice content rather than chat threads.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {foundationItems.map((item) => (
              <article
                key={item}
                className="rounded-[1.5rem] border border-[var(--border)] bg-white/60 p-5"
              >
                <p className="text-base leading-7">{item}</p>
              </article>
            ))}
          </div>

          <div className="grid gap-4 rounded-[1.5rem] border border-dashed border-[var(--border)] bg-[var(--surface-strong)]/50 p-5 md:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--token)]">
                token
              </p>
              <p className="mt-2 text-sm text-black/70">
                Precision playback and hover targeting at the smallest unit.
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--sentence)]">
                sentence
              </p>
              <p className="mt-2 text-sm text-black/70">
                Mid-range practice flow for bilingual support and replay.
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--paragraph)]">
                paragraph
              </p>
              <p className="mt-2 text-sm text-black/70">
                Coarse-grained progress, navigation, and content coverage.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <a
              href="/scenarios"
              className="rounded-full border border-[var(--paragraph)] bg-[var(--paragraph)] px-5 py-3 text-sm font-semibold tracking-wide text-white transition hover:opacity-90"
            >
              Browse scenarios
            </a>
            <a
              href="/openspec/changes/define-spoke-foundation/design.md"
              className="rounded-full border border-[var(--border)] px-5 py-3 text-sm font-semibold tracking-wide text-black/75 transition hover:bg-white/60"
            >
              Read foundation spec
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
