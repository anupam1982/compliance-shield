import { ComplianceShieldConfig } from "../validation/configSchema";

export const DEFAULT_COMPLIANCE_SHIELD_CONFIG: ComplianceShieldConfig = {
  blockedExtensions: [],
  bannedContentPatterns: [],
  secretDetection: {
    enabled: true,
  },
  rules: {
    ignorePaths: [],
  },
  comments: {
    enabled: true,
  },
  checks: {
    enabled: true,
  },
};