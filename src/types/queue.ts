export interface RepositoryScanJob {
  owner: string;
  repo: string;
  prNumber: number;
  triggeredBy: string;
  installationId?: number;
  accountLogin?: string;
}

export type AiCommandType =
  | "autofix"
  | "explain"
  | "why-blocked"
  | "explain-risk"
  | "top-risk";

export interface AiCommandJob {
  owner: string;
  repo: string;
  prNumber: number;
  triggeredBy: string;
  installationId: number;
  accountLogin?: string;
  command: AiCommandType;
}