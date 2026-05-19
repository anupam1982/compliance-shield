import { PolicyPack } from "./types";

export const pciDssPolicyPack: PolicyPack = {
  name: "pci-dss",

  description:
    "PCI-DSS governance pack focused on payment systems, cardholder data, and strong cryptographic controls.",

  rules: {
    blockSecrets: true,
    blockWeakCrypto: true,
    blockPII: true,
    blockInsecureHeaders: true
  },

  severityThresholds: {
    critical: 1,
    high: 3
  }
};