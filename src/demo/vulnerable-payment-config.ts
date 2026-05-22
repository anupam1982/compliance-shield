// DEMO ONLY: intentionally insecure sample for Compliance Shield demo.

const stripeApiKey = "sk_live_demo_1234567890abcdef";
const jwtSecret = "demo-hardcoded-jwt-secret";

import crypto from "crypto";

export function hashPassword(password: string): string {
  return crypto.createHash("md5").update(password).digest("hex");
}

export const paymentConfig = {
  environment: "production",
  debug: true,
  apiKey: stripeApiKey,
  jwtSecret
};