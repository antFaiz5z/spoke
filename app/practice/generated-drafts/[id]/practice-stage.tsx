"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createPracticeNodeKey } from "@/lib/practice";
import { getDefaultEnglishVoiceOptions } from "@/lib/tts";
import type { GeneratedDraftDetailResponse } from "@/lib/types/api";
import type { HoverLevel } from "@/lib/types/runtime";

type GeneratedDraftStageProps = {
  detail: GeneratedDraftDetailResponse;
};

function levelTone(index: number) {
  if (index === 0) {
    return "border-[var(--paragraph)]/35 bg-[var(--paragraph)]/6";
  }
  if (index % 2 === 0) {
    return "border-[var(--sentence)]/25 bg-[var(--sentence)]/5";
  }
  return "border-[var(--token)]/20 bg-[var(--token)]/5";
}

function hoverClass(level: HoverLevel) {
  if (level === "paragraph") {
    return "ring-2 ring-[var(--paragraph)]/45 bg-[var(--paragraph)]/8";
  }
  if (level === "sentence") {
    return "ring-2 ring-[var(--sentence)]/45 bg-[var(--sentence)]/10";
  }
  return "bg-[var(--token)]/15 text-black";
}

export function GeneratedDraftStage({ detail }: GeneratedDraftStageProps) {
  const router = useRouter();
  const { scenario, generatedDraft, structuredContent } = detail;
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const voiceOptions = useMemo(() => getDefaultEnglishVoiceOptions(), []);
  const [voiceId, setVoiceId] = useState(
    voiceOptions[0]?.id ?? "English_expressive_narrator",
  );

  async function saveDraft() {
    setIsSaving(true);
    setSaveError(null);

    try {
      const response = await fetch(`/api/generated-drafts/${generatedDraft.id}/save`, {
        method: "POST",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "Failed to save generated draft");
      }

      const payload = (await response.json()) as { savedContentItemId: string };
      router.push(`/practice/content-items/${payload.savedContentItemId}`);
      router.refresh();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Failed to save generated draft");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-10">
      <header className="mb-8 flex flex-col gap-4">
        <a
          href={`/scenarios/${scenario.slug}`}
          className="text-sm uppercase tracking-[0.16em] text-[var(--paragraph)]"
        >
          Back to article catalog
        </a>

        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.14em] text-black/55">
              <span>{scenario.title}</span>
              <span>·</span>
              <span>{generatedDraft.contentKind}</span>
              <span>·</span>
              <span>{generatedDraft.difficultyLevel}</span>
              <span>·</span>
              <span>Draft</span>
            </div>
            <h1 className="mt-3 text-4xl font-semibold">{generatedDraft.title}</h1>
            <p className="mt-3 text-sm text-black/65">
              Generated draft preview. Save it to add it to the scenario catalog.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-black/70">
              <span className="text-xs uppercase tracking-[0.12em] text-black/45">
                Voice
              </span>
              <select
                value={voiceId}
                onChange={(event) => setVoiceId(event.target.value)}
                className="bg-transparent pr-1 outline-none"
              >
                {voiceOptions.map((voice) => (
                  <option key={voice.id} value={voice.id}>
                    {voice.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={saveDraft}
              disabled={isSaving}
              className={`rounded-full border px-4 py-2 text-sm font-medium ${
                isSaving
                  ? "cursor-progress border-black/10 text-black/30"
                  : "border-[var(--border)] bg-[var(--surface)] text-black/75 hover:bg-white"
              }`}
            >
              {isSaving ? "Saving..." : "Save to scenario"}
            </button>
          </div>
        </div>
        {saveError ? <p className="text-sm text-red-700">{saveError}</p> : null}
      </header>

      <section
        className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)]/90 p-8 shadow-[0_20px_80px_rgba(60,35,10,0.08)]"
        onMouseLeave={() => setHoveredKey(null)}
      >
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
          {structuredContent.paragraphs.map((paragraph, index) => {
            const paragraphKey = createPracticeNodeKey("paragraph", paragraph.id);
            return (
              <article
                key={paragraph.id}
                className={`rounded-[1.5rem] border p-5 transition ${levelTone(index)} ${
                  hoveredKey === paragraphKey ? hoverClass("paragraph") : ""
                }`}
                onMouseEnter={() => setHoveredKey(paragraphKey)}
              >
                {paragraph.speakerLabel ? (
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--paragraph)]">
                    {paragraph.speakerLabel}
                  </p>
                ) : null}

                <div className="flex flex-wrap gap-x-2 gap-y-3 text-2xl leading-[1.8] text-black/90">
                  {paragraph.sentences.map((sentence) => {
                    const sentenceKey = createPracticeNodeKey("sentence", sentence.id);
                    return (
                      <span
                        key={sentence.id}
                        className={`inline-flex flex-wrap items-center gap-x-2 gap-y-3 rounded-xl px-1 py-1 transition ${
                          hoveredKey === sentenceKey ? hoverClass("sentence") : ""
                        }`}
                        onMouseEnter={(event) => {
                          event.stopPropagation();
                          setHoveredKey(sentenceKey);
                        }}
                      >
                        {sentence.tokens.map((token) => {
                          const tokenKey = createPracticeNodeKey("token", token.id);

                          if (token.isPunctuation) {
                            return (
                              <span key={token.id} className="text-black/55">
                                {token.text}
                              </span>
                            );
                          }

                          return (
                            <span
                              key={token.id}
                              className={`rounded-md px-1.5 py-0.5 transition ${
                                hoveredKey === tokenKey
                                  ? hoverClass("token")
                                  : "hover:bg-[var(--token)]/10"
                              }`}
                              onMouseEnter={(event) => {
                                event.stopPropagation();
                                setHoveredKey(tokenKey);
                              }}
                            >
                              {token.text}
                            </span>
                          );
                        })}
                      </span>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
