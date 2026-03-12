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
  ]
};