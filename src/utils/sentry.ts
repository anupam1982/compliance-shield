import * as Sentry from "@sentry/node";

export function initializeSentry(): void {
  if (!process.env.SENTRY_DSN) {
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || "0.1")
  });
}

export function captureException(error: unknown): void {
  if (!process.env.SENTRY_DSN) {
    return;
  }

  Sentry.captureException(error);
}