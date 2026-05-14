import { ComplianceViolation } from "../types/rules";
import { MockAIProvider } from "../ai/mockAIProvider";
import { OpenAIProvider } from "../ai/openAIProvider";
import { AIProvider } from "../ai/aiProvider";

function getProvider(): AIProvider {
  if (process.env.AI_ENABLED === "true" && process.env.OPENAI_API_KEY) {
    return new OpenAIProvider();
  }

  return new MockAIProvider();
}

export async function generateViolationRemediation(
  violation: ComplianceViolation
): Promise<string> {
  const provider = getProvider();

  return provider.generateRemediation({
    violationType: violation.type,
    severity: violation.severity,
    message: violation.message,
    indicator: violation.indicator
  });
}