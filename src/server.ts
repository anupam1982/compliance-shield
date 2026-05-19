import express from "express";
import { getHealthStatus } from "./services/healthService";
import { getReadinessStatus } from "./services/readinessService";
import { logger } from "./utils/logger";
import {
  getDashboardSummary,
  getRecentScans,
  getRepositorySummary,
  getScanTrends,
  getSeverityAnalytics,
  getRiskAnalytics
} from "./services/dashboardMetricsService";
import cors from "cors";
import { getScanDetails } from "./services/dashboardMetricsService";
import { generateExecutiveSummary } from "./services/aiSummaryService";
import { ComplianceViolation } from "./types/rules";
import {
  getRepositoryRiskLeaderboard,
  getOrgPostureSummary,
  getRecentOverrides,
  getOverrideGovernanceSummary
} from "./services/dashboardMetricsService";
import { runMigrations } from "./db/migrations/runMigrations";
import { Probot, createNodeMiddleware } from "probot";
import complianceShieldApp from "./app";


const app = express();
app.use(cors());

const port = Number(process.env.PORT || 3000);

const probot = new Probot({
  appId: process.env.APP_ID,
  privateKey: process.env.PRIVATE_KEY,
  secret: process.env.WEBHOOK_SECRET
});

probot.load(complianceShieldApp);

app.use(
  "/api/github/webhooks",
  createNodeMiddleware(complianceShieldApp, {
    probot,
    webhooksPath: "/"
  })
);

app.get("/health", async (_req, res) => {
  try {
    const health = await getHealthStatus();

    return res
      .status(health.status === "healthy" ? 200 : 500)
      .json(health);
  } catch (error) {
    logger.error(
      {
        event: "health.endpoint.failed",
        error
      },
      "Health endpoint failed"
    );

    return res.status(500).json({
      status: "unhealthy"
    });
  }
});

app.get("/ready", (_req, res) => {
  try {
    const readiness = getReadinessStatus();

    return res
      .status(readiness.status === "ready" ? 200 : 503)
      .json(readiness);
  } catch (error) {
    logger.error(
      {
        event: "readiness.endpoint.failed",
        error
      },
      "Readiness endpoint failed"
    );

    return res.status(500).json({
      status: "not_ready"
    });
  }
});

app.get("/api/metrics/scans", async (req, res) => {
  const limit = Number(req.query.limit || 20);
  const scans = await getRecentScans(limit);

  return res.json({
    data: scans
  });
});

app.get("/api/metrics/repos", async (_req, res) => {
  const repos = await getRepositorySummary();

  return res.json({
    data: repos
  });
});

app.get("/api/metrics/trends", async (req, res) => {
  const days = Number(req.query.days || 14);
  const trends = await getScanTrends(days);

  return res.json({
    data: trends
  });
});

app.get("/api/metrics/summary", async (_req, res) => {
  const summary = await getDashboardSummary();

  return res.json({
    data: summary
  });
});
app.get("/api/metrics/severity", async (_req, res) => {
  const severity = await getSeverityAnalytics();

  return res.json({
    data: severity
  });
});

app.get("/api/metrics/risk", async (_req, res) => {
  const risk = await getRiskAnalytics();

  return res.json({
    data: risk
  });
});

app.get("/api/metrics/scans/:id", async (req, res) => {
  const scanId = Number(req.params.id);

  const details = await getScanDetails(scanId);

  if (!details) {
    return res.status(404).json({
      error: "Scan not found"
    });
  }

  return res.json({
    data: details
  });
});

app.get(
  "/api/metrics/scans/:id/summary",
  async (req, res) => {
    const scanId = Number(req.params.id);

    const details = await getScanDetails(scanId);

    if (!details) {
      return res.status(404).json({
        error: "Scan not found"
      });
    }

    const violations = details.violations.map((v) => ({
      fileName: v.file_name,
      line: v.line_number,
      severity: v.severity as ComplianceViolation["severity"],
      indicator: v.indicator ?? undefined,
      message: v.message,
      suggestedFix:
        v.suggested_fix ?? undefined,
      type: "content" as const
    }));

    const summary =
      await generateExecutiveSummary(
        violations,
        details.scan.critical_count,
        details.scan.high_count
      );

    return res.json({
      data: summary
    });
  }
);

app.get("/api/metrics/repo-leaderboard", async (_req, res) => {
  const leaderboard = await getRepositoryRiskLeaderboard();

  return res.json({
    data: leaderboard
  });
});

app.get("/api/metrics/org-posture", async (_req, res) => {
  const posture = await getOrgPostureSummary();

  return res.json({
    data: posture
  });
});

app.get("/api/metrics/overrides", async (_req, res) => {
  const overrides = await getRecentOverrides();

  return res.json({
    data: overrides
  });
});

app.get(
  "/api/metrics/override-summary",
  async (_req, res) => {
    const summary =
      await getOverrideGovernanceSummary();

    return res.json({
      data: summary
    });
  }
);

async function bootstrap() {
  await runMigrations();

  app.listen(port, () => {
    logger.info(
      {
        event: "server.started",
        port
      },
      "Health server started"
    );
  });
}
bootstrap().catch((error) => {
  logger.error(
    {
      event: "server.bootstrap_failed",
      error
    },
    "Failed to start server"
  );
  process.exit(1);
});
