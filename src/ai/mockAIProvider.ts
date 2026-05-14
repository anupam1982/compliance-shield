import {
  AIProvider,
  AIRemediationRequest
} from "./aiProvider";

export class MockAIProvider implements AIProvider {
  async generateRemediation(
    input: AIRemediationRequest
  ): Promise<string> {
    return `
Potential security and compliance concerns were identified.

Key recommendations:
- Review insecure patterns carefully
- Remove exposed secrets or sensitive data
- Replace deprecated cryptographic algorithms
- Follow organizational secure coding standards

Business impact:
Unresolved issues may increase operational and compliance risk.
`;
  }
}