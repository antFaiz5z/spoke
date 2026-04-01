import { buildStructuredContent, normalizeText } from "@/lib/content-processing";
import {
  buildRebuiltGeneratedDraftTitle,
  normalizeGeneratedDraftText,
} from "@/lib/server/generated-drafts";
import type { ContentKind, SourceType } from "@/lib/types/content";

export type RebuildTarget = "all" | "content-items" | "generated-drafts";

export type RebuildStructuredContentArgs = {
  dryRun: boolean;
  apply: boolean;
  target: RebuildTarget;
};

export type StructuredContentRebuildPayload = {
  normalizedText: string;
  structuredContent: ReturnType<typeof buildStructuredContent>;
  paragraphCount: number;
  speakerLabelCount: number;
  rebuiltTitle: string | null;
};

type BuildStructuredContentRebuildPayloadInput = {
  rawText: string;
  contentKind?: ContentKind;
  sourceType?: SourceType;
  isGeneratedDraft?: boolean;
  existingTitle?: string;
  scenarioTitle?: string;
  difficultyLevel?: string;
};

export function parseRebuildStructuredContentArgs(
  args: string[],
): RebuildStructuredContentArgs {
  const apply = args.includes("--apply");
  const dryRun = args.includes("--dry-run") || !apply;
  const targetIndex = args.findIndex((arg) => arg === "--target");
  const target = (targetIndex >= 0 ? args[targetIndex + 1] : "all") as RebuildTarget;

  if (!["all", "content-items", "generated-drafts"].includes(target)) {
    throw new Error(
      "Usage: tsx scripts/rebuild-structured-content.ts [--dry-run|--apply] [--target all|content-items|generated-drafts]",
    );
  }

  return {
    dryRun,
    apply,
    target,
  };
}

export function buildStructuredContentRebuildPayload({
  rawText,
  contentKind,
  sourceType,
  isGeneratedDraft = false,
  scenarioTitle,
  difficultyLevel,
}: BuildStructuredContentRebuildPayloadInput): StructuredContentRebuildPayload {
  const normalizedText =
    contentKind && (isGeneratedDraft || sourceType === "generated")
      ? normalizeGeneratedDraftText(rawText, contentKind)
      : normalizeText(rawText);
  const structuredContent = buildStructuredContent(normalizedText);
  const rebuiltTitle =
    isGeneratedDraft && contentKind && scenarioTitle && difficultyLevel
      ? buildRebuiltGeneratedDraftTitle({
          normalizedText,
          scenarioTitle,
          contentKind,
          difficultyLevel,
        })
      : null;

  return {
    normalizedText,
    structuredContent,
    paragraphCount: structuredContent.paragraphs.length,
    speakerLabelCount: structuredContent.paragraphs.filter((p) => Boolean(p.speakerLabel)).length,
    rebuiltTitle,
  };
}
