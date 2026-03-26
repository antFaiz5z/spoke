export type HoverLevel = "paragraph" | "sentence" | "token";

export type NodeRef = {
  key: string;
  id: string;
  level: HoverLevel;
};

export type HoverReason =
  | "token-hit"
  | "sentence-hit"
  | "paragraph-hit"
  | "hold"
  | "fallback"
  | "exit";
