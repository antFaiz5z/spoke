import type { StructuredContent } from "@/lib/types/content";

const META_LABELS = new Set([
  "situation",
  "goal",
  "context",
  "task",
  "note",
  "notes",
  "instruction",
  "instructions",
]);

export function normalizeText(input: string): string {
  return input
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const SENTENCE_PATTERN = /[^.!?]+[.!?]+(?:["')\]]+)?|[^.!?]+$/g;
const TOKEN_PATTERN = /[\p{L}\p{N}]+(?:['-][\p{L}\p{N}]+)*|[^\s\p{L}\p{N}]/gu;
const NON_TERMINATING_ABBREVIATIONS = new Set([
  "mr.",
  "mrs.",
  "ms.",
  "dr.",
  "prof.",
  "sr.",
  "jr.",
  "st.",
  "vs.",
  "etc.",
]);

function splitSentences(text: string) {
  const rawMatches = Array.from(text.matchAll(SENTENCE_PATTERN));
  const matches =
    rawMatches.length > 0
      ? rawMatches.map((match) => ({
          text: match[0],
          index: match.index ?? 0,
        }))
      : [{ text, index: 0 }];
  const sentences: Array<{ text: string; index: number }> = [];

  for (const match of matches) {
    const sentenceText = match.text.trim();
    if (!sentenceText) {
      continue;
    }

    const previous = sentences[sentences.length - 1];
    if (previous && NON_TERMINATING_ABBREVIATIONS.has(previous.text.trim().toLowerCase())) {
      previous.text = `${previous.text} ${sentenceText}`;
      continue;
    }

    sentences.push({
      text: sentenceText,
      index: match.index,
    });
  }

  return sentences;
}

function parseParagraphPrefix(paragraphText: string) {
  const match = paragraphText.match(/^\(?\s*([A-Za-z][A-Za-z0-9'()\- ]{0,40})\s*[:：]\s*(.+?)\)?$/s);

  if (!match) {
    return {
      paragraphType: "spoken" as const,
      metaLabel: null,
      speakerId: null,
      speakerLabel: null,
      contentText: paragraphText,
      contentOffset: 0,
    };
  }

  const label = match[1].trim();
  const contentText = match[2].trim();
  const contentOffset = paragraphText.indexOf(contentText);
  const normalizedLabel = label.toLowerCase();

  if (META_LABELS.has(normalizedLabel)) {
    return {
      paragraphType: "meta" as const,
      metaLabel: label,
      speakerId: null,
      speakerLabel: null,
      contentText,
      contentOffset: contentOffset >= 0 ? contentOffset : 0,
    };
  }

  return {
    paragraphType: "spoken" as const,
    metaLabel: null,
    speakerId: label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    speakerLabel: label,
    contentText,
    contentOffset: contentOffset >= 0 ? contentOffset : 0,
  };
}

export function buildStructuredContent(text: string): StructuredContent {
  const paragraphTexts = text
    .split(/\n\s*\n/g)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  let offset = 0;

  const paragraphs = paragraphTexts.map((paragraphText, paragraphIndex) => {
    const paragraphStart = text.indexOf(paragraphText, offset);
    const paragraphEnd = paragraphStart + paragraphText.length;
    offset = paragraphEnd;

    const { paragraphType, metaLabel, speakerId, speakerLabel, contentText, contentOffset } =
      parseParagraphPrefix(paragraphText);
    const paragraphContentStart = paragraphStart + contentOffset;
    const sentenceMatches = splitSentences(contentText);
    const sentences = sentenceMatches.map((match, sentenceIndex) => {
        const sentenceText = match.text;
        const localSentenceStart = contentText.indexOf(sentenceText, match.index);
        const sentenceStart = paragraphContentStart + Math.max(localSentenceStart, 0);
        const sentenceEnd = sentenceStart + sentenceText.length;
        const tokenMatches = Array.from(sentenceText.matchAll(TOKEN_PATTERN));
        const tokens = tokenMatches.map((tokenMatch, tokenIndex) => {
          const tokenText = tokenMatch[0];
          const tokenStart = sentenceStart + (tokenMatch.index ?? 0);
          const tokenEnd = tokenStart + tokenText.length;

          return {
            id: `t${paragraphIndex + 1}_${sentenceIndex + 1}_${tokenIndex + 1}`,
            index: tokenIndex,
            text: tokenText,
            normalizedText: tokenText.toLowerCase(),
            isPunctuation: /^[^\p{L}\p{N}]+$/u.test(tokenText),
            startOffset: tokenStart,
            endOffset: tokenEnd,
          };
        });

        return {
          id: `s${paragraphIndex + 1}_${sentenceIndex + 1}`,
          index: sentenceIndex,
          text: sentenceText,
          startOffset: sentenceStart,
          endOffset: sentenceEnd,
          tokens,
        };
      });

    return {
      id: `p${paragraphIndex + 1}`,
      index: paragraphIndex,
      paragraphType,
      metaLabel,
      speakerId,
      speakerLabel,
      text: contentText,
      startOffset: paragraphContentStart,
      endOffset: paragraphContentStart + contentText.length,
      sentences,
    };
  });

  return {
    version: 1,
    paragraphs,
  };
}
