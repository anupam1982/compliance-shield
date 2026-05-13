import express from "express";
import { getHealthStatus } from "./services/healthService";
import { getReadinessStatus } from "./services/readinessService";
import { logger } from "./utils/logger";

const app = express();

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

app.listen(port, () => {
  logger.info(
    {
      event: "server.started",
      port
    },
    "Health server started"
  );
});