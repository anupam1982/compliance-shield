export interface ReadinessResult {
    status: "ready" | "not_ready";
    missingEnvVars: string[];
    timestamp: string;
  }
  
  const requiredEnvVars = [
    "APP_ID",
    "PRIVATE_KEY",
    "WEBHOOK_SECRET"
  ];
  
  export function getReadinessStatus(): ReadinessResult {
    const missingEnvVars = requiredEnvVars.filter((name) => !process.env[name]);
  
    return {
      status: missingEnvVars.length === 0 ? "ready" : "not_ready",
      missingEnvVars,
      timestamp: new Date().toISOString()
    };
  }