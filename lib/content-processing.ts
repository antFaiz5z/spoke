import type { StructuredContent } from "@/lib/types/content";

export function normalizeText(input: string): string {
  return input.replace(/\r\n/g, "\n").trim();
}

function parseSpeakerParagraph(paragraphText: string) {
  const match = paragraphText.match(/^([A-Za-z][A-Za-z0-9'()\- ]{0,40})\s*[:：]\s*(.+)$/s);

  if (!match) {
    return {
      speakerId: null,
      speakerLabel: null,
      spokenText: paragraphText,
      spokenOffset: 0,
    };
  }

  const speakerLabel = match[1].trim();
  const spokenText = match[2].trim();
  const spokenOffset = paragraphText.indexOf(spokenText);

  return {
    speakerId: speakerLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    speakerLabel,
    spokenText,
    spokenOffset: spokenOffset >= 0 ? spokenOffset : 0,
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

    const { speakerId, speakerLabel, spokenText, spokenOffset } = parseSpeakerParagraph(paragraphText);
    const sentenceText = spokenText;
    const sentenceStart = paragraphStart + spokenOffset;
    const sentenceEnd = sentenceStart + sentenceText.length;

    const tokens = sentenceText.split(/\s+/).flatMap((tokenText, tokenIndex, arr) => {
      const localStart =
        tokenIndex === 0
          ? 0
          : arr.slice(0, tokenIndex).join(" ").length + 1;
      const tokenStart = sentenceStart + localStart;
      const tokenEnd = tokenStart + tokenText.length;

      return [
        {
          id: `t${paragraphIndex + 1}_${tokenIndex + 1}`,
          index: tokenIndex,
          text: tokenText,
          normalizedText: tokenText.toLowerCase(),
          isPunctuation: /^[^\p{L}\p{N}]+$/u.test(tokenText),
          startOffset: tokenStart,
          endOffset: tokenEnd,
        },
      ];
    });

    return {
      id: `p${paragraphIndex + 1}`,
      index: paragraphIndex,
      speakerId,
      speakerLabel,
      text: sentenceText,
      startOffset: sentenceStart,
      endOffset: sentenceEnd,
      sentences: [
        {
          id: `s${paragraphIndex + 1}_1`,
          index: 0,
          text: sentenceText,
          startOffset: sentenceStart,
          endOffset: sentenceEnd,
          tokens,
        },
      ],
    };
  });

  return {
    version: 1,
    paragraphs,
  };
}
