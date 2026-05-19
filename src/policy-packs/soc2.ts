import { PolicyPack } from "./types";

export const soc2PolicyPack: PolicyPack = {
  name: "soc2",

  description:
    "SOC2-oriented secure development governance pack.",

  rules: {
    blockSecrets: true,
    blockWeakCrypto: true,
    blockPII: true,
    blockInsecureHeaders: true
  },

  severityThresholds: {
    critical: 1,
    high: 5
  }
};