import { buildStructuredContent, normalizeText } from "@/lib/content-processing";

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

export function buildStructuredContentRebuildPayload(
  rawText: string,
): StructuredContentRebuildPayload {
  const normalizedText = normalizeText(rawText);
  const structuredContent = buildStructuredContent(normalizedText);

  return {
    normalizedText,
    structuredContent,
    paragraphCount: structuredContent.paragraphs.length,
    speakerLabelCount: structuredContent.paragraphs.filter((p) => Boolean(p.speakerLabel)).length,
  };
}
