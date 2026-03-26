import type { ContentKind, SourceType, StructuredContent } from "@/lib/types/content";

export type ReadProgress = {
  readCount: number;
  totalCount: number;
  ratio: number;
};

export type ScenarioListItem = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  articleCount: number;
  readProgress: ReadProgress;
  lastReadAt: string | null;
};

export type ScenarioDetail = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: string;
  articleCount: number;
  readProgress: ReadProgress;
};

export type ContentCatalogItem = {
  id: string;
  title: string;
  contentKind: ContentKind;
  difficultyLevel: string;
  sourceType: SourceType;
  hasRead: boolean;
  farthestParagraphIndex: number;
  updatedAt: string;
};

export type ScenarioContentListResponse = {
  scenario: Pick<ScenarioDetail, "id" | "slug" | "title">;
  items: ContentCatalogItem[];
};

export type ContentItemDetailResponse = {
  subjectType: "contentItem";
  scenario: Pick<ScenarioDetail, "id" | "slug" | "title">;
  contentItem: {
    id: string;
    scenarioId: string;
    title: string;
    contentKind: ContentKind;
    difficultyLevel: string;
    sourceType: SourceType;
    status: string;
  };
  structuredContent: StructuredContent;
  articleProgress: {
    farthestParagraphIndex: number;
    lastReadAt: string | null;
  };
  articleReadState: {
    hasRead: boolean;
    firstReadAt: string | null;
    lastReadAt: string | null;
  };
  navigation: {
    prevContentItemId: string | null;
    nextContentItemId: string | null;
    isFirst: boolean;
    isLast: boolean;
  };
};

export type GeneratedDraftDetailResponse = {
  subjectType: "generatedDraft";
  scenario: Pick<ScenarioDetail, "id" | "slug" | "title">;
  generatedDraft: {
    id: string;
    scenarioId: string;
    title: string;
    contentKind: ContentKind;
    difficultyLevel: string;
    status: string;
    insertedToStage: boolean;
    savedContentItemId: string | null;
  };
  structuredContent: StructuredContent;
};

export type CreateGeneratedDraftRequest = {
  scenarioSlug: string;
  prompt: string;
  contentKind: ContentKind;
  difficultyLevel: string;
};

export type CreateGeneratedDraftResponse = {
  generatedDraftId: string;
  status: "ready";
};

export type MarkReadRequest = {
  event: "body_interaction";
};

export type MarkReadResponse = {
  contentItemId: string;
  hasRead: true;
  firstReadAt: string;
  lastReadAt: string;
};

export type UpdateProgressRequest = {
  farthestParagraphIndex: number;
};

export type UpdateProgressResponse = {
  contentItemId: string;
  farthestParagraphIndex: number;
  lastReadAt: string;
};

export type SaveGeneratedDraftResponse = {
  generatedDraftId: string;
  savedContentItemId: string;
};

export type SynthesizeSpeechRequest = {
  text: string;
  voiceId?: string;
};
