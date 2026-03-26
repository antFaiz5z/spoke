import { listScenarios } from "@/lib/server/scenarios";

export const dynamic = "force-dynamic";

export default async function ScenariosPage() {
  const scenarios = await listScenarios();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-12">
      <div className="mb-8 flex flex-col gap-3">
        <a
          href="/"
          className="text-sm uppercase tracking-[0.16em] text-[var(--paragraph)]"
        >
          spoke
        </a>
        <h1 className="text-4xl font-semibold">Scenario catalog</h1>
        <p className="max-w-2xl text-base leading-7 text-black/70">
          Pick a scenario, review coverage progress, and continue into the
          article catalog for that practice area.
        </p>
      </div>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {scenarios.map((scenario) => (
          <a
            key={scenario.id}
            href={`/scenarios/${scenario.slug}`}
            className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)]/90 p-6 shadow-[0_18px_50px_rgba(60,35,10,0.08)] transition hover:-translate-y-0.5 hover:bg-white"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--paragraph)]">
                  {scenario.articleCount} articles
                </p>
                <h2 className="mt-2 text-2xl font-semibold">{scenario.title}</h2>
              </div>
              <div className="rounded-full border border-[var(--border)] px-3 py-1 text-sm text-black/65">
                {Math.round(scenario.readProgress.ratio * 100)}%
              </div>
            </div>

            <p className="mt-4 text-sm leading-7 text-black/70">{scenario.summary}</p>

            <div className="mt-6 flex flex-col gap-2">
              <div className="h-2 rounded-full bg-black/8">
                <div
                  className="h-2 rounded-full bg-[var(--paragraph)]"
                  style={{ width: `${scenario.readProgress.ratio * 100}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-sm text-black/60">
                <span>
                  {scenario.readProgress.readCount} / {scenario.readProgress.totalCount} read
                </span>
                <span>{scenario.lastReadAt ? "Practiced before" : "Not started"}</span>
              </div>
            </div>
          </a>
        ))}
      </section>
    </main>
  );
}
