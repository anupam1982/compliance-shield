import { ComplianceRuleSet } from "../types/rules";

export const defaultRules: ComplianceRuleSet = {
  bannedFileIndicators: [
    { value: ".pem", severity: "high" },
    { value: ".pfx", severity: "high" },
    { value: ".p12", severity: "high" },
    { value: "id_rsa", severity: "critical" }
  ],
  bannedContentIndicators: [
    { value: "MD5", severity: "medium" },
    { value: "DES", severity: "high" },
    { value: "password=", severity: "high" },
    { value: "api_key", severity: "high" },
    { value: "secret", severity: "medium" },
    { value: "private_key", severity: "critical" }
  ],
  secretPatterns: [
    {
      name: "AWS Access Key",
      pattern: "AKIA[0-9A-Z]{16}",
      severity: "critical"
    },
    {
      name: "GitHub Personal Access Token",
      pattern: "ghp_[A-Za-z0-9]{36,}",
      severity: "critical"
    },
    {
      name: "Private Key Block",
      pattern: "-----BEGIN [A-Z ]*PRIVATE KEY-----",
      severity: "critical"
    },
    {
      name: "Stripe Live Secret Key",
      pattern: "sk_live_[A-Za-z0-9]{16,}",
      severity: "critical"
    },
    {
      name: "JWT Token",
      pattern: "eyJ[A-Za-z0-9_-]+\\.[A-Za-z0-9._-]+\\.[A-Za-z0-9._-]+",
      severity: "high"
    }
  ],
  minimumSeverityToFail: "high"
};