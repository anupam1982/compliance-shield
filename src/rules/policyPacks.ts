import { ComplianceRuleSet, PolicyName } from "../types/rules";
import { defaultRules } from "./defaultRules";

export const policyPacks: Record<PolicyName, ComplianceRuleSet> = {
  baseline: {
    ...defaultRules
  },

  strict: {
    bannedFileIndicators: [
      { value: ".pem", severity: "critical" },
      { value: ".pfx", severity: "critical" },
      { value: ".p12", severity: "critical" },
      { value: ".key", severity: "high" },
      { value: "id_rsa", severity: "critical" }
    ],
    bannedContentIndicators: [
      { value: "MD5", severity: "high" },
      { value: "DES", severity: "critical" },
      { value: "password=", severity: "critical" },
      { value: "api_key", severity: "critical" },
      { value: "secret", severity: "high" },
      { value: "private_key", severity: "critical" },
      { value: "console.log", severity: "low" }
    ],
    secretPatterns: [...defaultRules.secretPatterns],
    minimumSeverityToFail: "medium",
    ignorePaths: [],
    ignoreIndicators: [],
    inlineIgnoreComment: "compliance-shield-ignore",
    scanMode: "full-file",
    maxRepositoryFiles: 200,
    maxFileSizeKB: 200,
    parallelFileFetchLimit: 10
  },

  "secrets-only": {
    bannedFileIndicators: [
      { value: ".pem", severity: "critical" },
      { value: ".pfx", severity: "critical" },
      { value: ".p12", severity: "critical" },
      { value: "id_rsa", severity: "critical" }
    ],
    bannedContentIndicators: [],
    secretPatterns: [...defaultRules.secretPatterns],
    minimumSeverityToFail: "high",
    ignorePaths: [],
    ignoreIndicators: [],
    inlineIgnoreComment: "compliance-shield-ignore",
    scanMode: "full-file",
    maxRepositoryFiles: 200,
    maxFileSizeKB: 200,
    parallelFileFetchLimit: 10
  },

  crypto: {
    bannedFileIndicators: [],
    bannedContentIndicators: [
      { value: "MD5", severity: "high" },
      { value: "DES", severity: "critical" },
      { value: "SHA1", severity: "high" },
      { value: "RC4", severity: "critical" }
    ],
    secretPatterns: [],
    minimumSeverityToFail: "medium",
    ignorePaths: [],
    ignoreIndicators: [],
    inlineIgnoreComment: "compliance-shield-ignore",
    scanMode: "diff",
    maxRepositoryFiles: 200,
    maxFileSizeKB: 200,
    parallelFileFetchLimit: 10
  }
};

export function getPolicyPack(policyName: PolicyName): ComplianceRuleSet {
  return policyPacks[policyName];
}