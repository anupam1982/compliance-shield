import { soc2PolicyPack } from "./soc2";
import { gdprPolicyPack } from "./gdpr";
import { pciDssPolicyPack } from "./pciDss";
import { hipaaPolicyPack } from "./hipaa";
import { owaspPolicyPack } from "./owasp";
import { PolicyPack } from "./types";

const registry: Record<string, PolicyPack> = {
  soc2: soc2PolicyPack,
  gdpr: gdprPolicyPack,
  "pci-dss": pciDssPolicyPack,
  hipaa: hipaaPolicyPack,
  owasp: owaspPolicyPack
};

export function getCompliancePolicyPack(
    name?: string
  ): PolicyPack | undefined {
    if (!name) {
      return undefined;
    }
  
    return registry[name.toLowerCase()];
  }