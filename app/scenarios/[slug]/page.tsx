import { notFound } from "next/navigation";
import { getScenarioBySlug, listScenarioContentItems } from "@/lib/server/scenarios";

export const dynamic = "force-dynamic";

function formatKind(kind: string) {
  return kind.replace(/-/g, " ");
}

export default async function ScenarioDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [scenario, contentList] = await Promise.all([
    getScenarioBySlug(slug),
    listScenarioContentItems(slug),
  ]);

  if (!scenario || !contentList) {
    notFound();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-12">
      <div className="mb-8 flex flex-col gap-3">
        <a
          href="/scenarios"
          className="text-sm uppercase tracking-[0.16em] text-[var(--paragraph)]"
        >
          Back to scenarios
        </a>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-semibold">{scenario.title}</h1>
            <p className="mt-3 text-base leading-7 text-black/70">
              {scenario.summary}
            </p>
          </div>
          <div className="rounded-[1.25rem] border border-[var(--border)] bg-[var(--surface)]/80 px-5 py-4 text-sm text-black/70">
            <div>{scenario.articleCount} total articles</div>
            <div className="mt-1">
              {scenario.readProgress.readCount} read ·{" "}
              {Math.round(scenario.readProgress.ratio * 100)}% coverage
            </div>
          </div>
        </div>
      </div>

      <section className="grid gap-4">
        {contentList.items.map((item) => (
          <a
            key={item.id}
            href={`/practice/content-items/${item.id}`}
            className="grid gap-4 rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)]/90 p-5 shadow-[0_15px_30px_rgba(60,35,10,0.06)] transition hover:bg-white md:grid-cols-[1fr_auto]"
          >
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.14em] text-black/55">
                <span>{formatKind(item.contentKind)}</span>
                <span>·</span>
                <span>{item.difficultyLevel}</span>
                <span>·</span>
                <span>{item.sourceType}</span>
              </div>
              <h2 className="mt-2 text-xl font-semibold">{item.title}</h2>
              <p className="mt-3 text-sm text-black/65">
                {item.hasRead
                  ? `Continue from paragraph ${item.farthestParagraphIndex + 1}`
                  : "Not started yet"}
              </p>
            </div>

            <div className="flex items-center justify-between gap-5 md:flex-col md:items-end">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${
                  item.hasRead
                    ? "bg-[var(--sentence)]/12 text-[var(--sentence)]"
                    : "bg-black/6 text-black/55"
                }`}
              >
                {item.hasRead ? "Read" : "Unread"}
              </span>
              <span className="text-sm text-black/55">Open practice</span>
            </div>
          </a>
        ))}
      </section>
    </main>
  );
}
