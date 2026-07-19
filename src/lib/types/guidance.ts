import { z } from "zod";

export const decisionModes = [
  "career",
  "project",
  "partnership",
  "motivation",
] as const;

export type DecisionMode = (typeof decisionModes)[number];

export const guidanceDocumentTypes = [
  "north_star",
  "principle",
  "project",
  "framework",
  "corpus",
] as const;

export type GuidanceDocumentType = (typeof guidanceDocumentTypes)[number];

export const documentStatuses = ["active", "draft", "archived"] as const;
export type DocumentStatus = (typeof documentStatuses)[number];

export const syncJobStatuses = [
  "pending",
  "running",
  "completed",
  "failed",
] as const;
export type SyncJobStatus = (typeof syncJobStatuses)[number];

/** Maps Notion database env keys to internal document types */
export const notionDatabaseEnvMap: Record<
  GuidanceDocumentType,
  string
> = {
  north_star: "NOTION_DATABASE_NORTH_STAR",
  principle: "NOTION_DATABASE_PRINCIPLES",
  project: "NOTION_DATABASE_PROJECTS",
  framework: "NOTION_DATABASE_FRAMEWORKS",
  corpus: "NOTION_DATABASE_CORPUS",
};

export interface ModeRetrievalConfig {
  documentTypes: GuidanceDocumentType[];
  frameworkMode: DecisionMode;
  maxDocuments: number;
  maxTokens: number;
  includeStarredPrinciples: boolean;
}

export const modeRetrievalConfig: Record<DecisionMode, ModeRetrievalConfig> = {
  career: {
    documentTypes: ["north_star", "principle", "corpus"],
    frameworkMode: "career",
    maxDocuments: 8,
    maxTokens: 6000,
    includeStarredPrinciples: true,
  },
  project: {
    documentTypes: ["project", "principle", "north_star"],
    frameworkMode: "project",
    maxDocuments: 10,
    maxTokens: 6000,
    includeStarredPrinciples: true,
  },
  partnership: {
    documentTypes: ["framework", "principle", "north_star", "project"],
    frameworkMode: "partnership",
    maxDocuments: 10,
    maxTokens: 8000,
    includeStarredPrinciples: true,
  },
  motivation: {
    documentTypes: ["project", "principle", "north_star"],
    frameworkMode: "motivation",
    maxDocuments: 6,
    maxTokens: 5000,
    includeStarredPrinciples: true,
  },
};

/** Raw page shape after Notion property mapping */
export interface NotionPageMapping {
  notionPageId: string;
  notionDatabaseId: string;
  type: GuidanceDocumentType;
  title: string;
  status: DocumentStatus;
  content: string;
  summary?: string;
  priority: number;
  starred: boolean;
  tags: string[];
  modes: DecisionMode[];
  properties: Record<string, string | number | boolean | string[]>;
  lastEditedNotion: Date;
}

export interface GuidanceSource {
  id: string;
  notionPageId: string;
  title: string;
  type: GuidanceDocumentType;
  priority: number;
  starred: boolean;
}

export interface GuidanceContextBundle {
  mode: DecisionMode;
  context: string;
  sources: GuidanceSource[];
  tokenEstimate: number;
  assembledAt: string;
}

export const guidanceRequestSchema = z.object({
  mode: z.enum(decisionModes),
  query: z.string().optional(),
  projectId: z.string().uuid().optional(),
});

export type GuidanceRequest = z.infer<typeof guidanceRequestSchema>;

export const syncRequestSchema = z.object({
  full: z.boolean().optional().default(false),
});

export type SyncRequest = z.infer<typeof syncRequestSchema>;
