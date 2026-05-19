import { PolicyPack } from "./types";

export const owaspPolicyPack: PolicyPack = {
  name: "owasp",

  description:
    "OWASP-focused application security policy pack.",

  rules: {
    blockSecrets: true,
    blockWeakCrypto: true,
    blockPII: false,
    blockInsecureHeaders: true
  },

  severityThresholds: {
    critical: 2,
    high: 8
  }
};