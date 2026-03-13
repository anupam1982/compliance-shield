import { ComplianceRuleSet } from "../types/rules";

export const defaultRules: ComplianceRuleSet = {
  bannedFileIndicators: [".pem", ".pfx", ".p12", "id_rsa"],
  bannedContentIndicators: [
    "MD5",
    "DES",
    "password=",
    "api_key",
    "secret",
    "private_key"
  ],
  secretPatterns: [
    {
      name: "AWS Access Key",
      pattern: "AKIA[0-9A-Z]{16}"
    },
    {
      name: "GitHub Personal Access Token",
      pattern: "ghp_[A-Za-z0-9]{36,}"
    },
    {
      name: "Private Key Block",
      pattern: "-----BEGIN [A-Z ]*PRIVATE KEY-----"
    },
    {
      name: "Stripe Live Secret Key",
      pattern: "sk_live_[A-Za-z0-9]{16,}"
    },
    {
      name: "JWT Token",
      pattern: "eyJ[A-Za-z0-9_-]+\\.[A-Za-z0-9._-]+\\.[A-Za-z0-9._-]+"
    }
  ]
};