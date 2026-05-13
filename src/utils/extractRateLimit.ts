import { GitHubRateLimitInfo } from "./rateLimitMonitor";

export function extractRateLimit(
  headers: Record<string, unknown>
): GitHubRateLimitInfo {
  return {
    limit: Number(headers["x-ratelimit-limit"] ?? 0),
    remaining: Number(headers["x-ratelimit-remaining"] ?? 0),
    reset: Number(headers["x-ratelimit-reset"] ?? 0)
  };
}