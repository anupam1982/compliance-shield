import { PolicyPack } from "./types";

export const gdprPolicyPack: PolicyPack = {
  name: "gdpr",

  description:
    "GDPR-focused governance pack for protecting personal data and sensitive information.",

  rules: {
    blockSecrets: true,
    blockWeakCrypto: true,
    blockPII: true,
    blockInsecureHeaders: true
  },

  severityThresholds: {
    critical: 1,
    high: 4
  }
};