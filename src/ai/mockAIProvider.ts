import {
    AIProvider,
    AIRemediationRequest
  } from "./aiProvider";
  
  export class MockAIProvider implements AIProvider {
    async generateRemediation(
      input: AIRemediationRequest
    ): Promise<string> {
      return `
  AI Guidance:
  The violation "${input.indicator ?? input.violationType}" may introduce security or compliance risks.
  
  Recommended actions:
  - Review the affected code carefully
  - Remove sensitive or insecure patterns
  - Follow secure coding best practices
  - Validate against repository compliance policies
  `;
    }
  }