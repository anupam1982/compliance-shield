import { PolicyPack } from "./types";

export const hipaaPolicyPack: PolicyPack = {
  name: "hipaa",

  description:
    "HIPAA-oriented governance pack focused on PHI protection, auditability, and secure healthcare data handling.",

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