export type ContentKind = "dialogue" | "monologue" | "qa" | "script";

export type SourceType = "preset" | "generated";

export type StructuredContent = {
  version: 1;
  paragraphs: ParagraphNode[];
};

export type ParagraphNode = {
  id: string;
  index: number;
  speakerId?: string | null;
  speakerLabel?: string | null;
  text: string;
  startOffset: number;
  endOffset: number;
  sentences: SentenceNode[];
};

export type SentenceNode = {
  id: string;
  index: number;
  text: string;
  startOffset: number;
  endOffset: number;
  tokens: TokenNode[];
};

export type TokenNode = {
  id: string;
  index: number;
  text: string;
  normalizedText: string;
  isPunctuation: boolean;
  startOffset: number;
  endOffset: number;
};
