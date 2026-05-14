import { ComplianceViolation } from "../types/rules";
import { MockAIProvider } from "../ai/mockAIProvider";

const provider = new MockAIProvider();

export async function generateViolationRemediation(
  violation: ComplianceViolation
): Promise<string> {
  return provider.generateRemediation({
    violationType: violation.type,
    severity: violation.severity,
    message: violation.message,
    indicator: violation.indicator
  });
}