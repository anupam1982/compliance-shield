import { logger } from "./logger";

export interface GitHubRateLimitInfo {
  limit?: number;
  remaining?: number;
  reset?: number;
}

export function monitorRateLimit(
  info: GitHubRateLimitInfo,
  context: string
): void {
  const remaining = info.remaining ?? 0;

  if (remaining < 100) {
    logger.error(
      {
        event: "github.rate_limit.critical",
        context,
        remaining,
        limit: info.limit,
        reset: info.reset
      },
      "GitHub API rate limit critically low"
    );

    return;
  }

  if (remaining < 500) {
    logger.warn(
      {
        event: "github.rate_limit.warning",
        context,
        remaining,
        limit: info.limit,
        reset: info.reset
      },
      "GitHub API rate limit running low"
    );

    return;
  }

  if (remaining < 1000) {
    logger.info(
      {
        event: "github.rate_limit.notice",
        context,
        remaining,
        limit: info.limit,
        reset: info.reset
      },
      "GitHub API rate limit decreasing"
    );
  }
}