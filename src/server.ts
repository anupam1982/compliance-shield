import express from "express";
import { getHealthStatus } from "./services/healthService";
import { getReadinessStatus } from "./services/readinessService";
import { logger } from "./utils/logger";
import {
  getDashboardSummary,
  getRecentScans,
  getRepositorySummary,
  getScanTrends
} from "./services/dashboardMetricsService";
import cors from "cors";

const app = express();
app.use(cors());

const port = Number(process.env.PORT || 3000);

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

app.listen(port, () => {
  logger.info(
    {
      event: "server.started",
      port
    },
    "Health server started"
  );
});