export interface RepositoryScanJob {
  owner: string;
  repo: string;
  prNumber: number;
  triggeredBy: string;
  installationId?: number;
}