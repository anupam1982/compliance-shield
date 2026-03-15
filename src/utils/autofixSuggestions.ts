import { ComplianceViolation } from "../types/rules";

export interface AutofixSuggestion {
  title: string;
  suggestion: string;
}

function getSuggestionByIndicator(indicator: string): AutofixSuggestion | null {
  switch (indicator) {
    case "MD5":
      return {
        title: "Replace weak hash algorithm",
        suggestion: "Use SHA-256 or stronger instead of MD5."
      };
    case "DES":
      return {
        title: "Replace weak cipher",
        suggestion: "Use AES-256 or another modern cipher instead of DES."
      };
    case "password=":
      return {
        title: "Remove hardcoded password",
        suggestion: "Move secrets to environment variables or a secret manager."
      };
    case "api_key":
      return {
        title: "Remove hardcoded API key",
        suggestion: "Store API keys in environment variables, GitHub Actions secrets, or a secret manager."
      };
    case "private_key":
    case "Private Key Block":
      return {
        title: "Remove embedded private key",
        suggestion: "Delete the private key from the repository and rotate the exposed credential immediately."
      };
    case "GitHub Personal Access Token":
      return {
        title: "Revoke exposed GitHub token",
        suggestion: "Revoke the token in GitHub settings, create a new one if needed, and move it to secure storage."
      };
    case "AWS Access Key":
      return {
        title: "Rotate exposed AWS key",
        suggestion: "Disable or rotate the AWS key in IAM and move credentials to secure runtime configuration."
      };
    case "JWT Token":
      return {
        title: "Avoid committing bearer tokens",
        suggestion: "Remove the token from source control and regenerate it if it was real."
      };
    default:
      return null;
  }
}

export function getAutofixSuggestion(
  violation: ComplianceViolation
): AutofixSuggestion | null {
  const direct = getSuggestionByIndicator(violation.indicator);

  if (direct) {
    return direct;
  }

  if (violation.type === "file") {
    return {
      title: "Remove sensitive file from source control",
      suggestion: "Delete the file from the repository, rotate any exposed credentials, and add the path to ignore rules or .gitignore if needed."
    };
  }

  if (violation.type === "secret-pattern") {
    return {
      title: "Rotate and remove exposed secret",
      suggestion: "Remove the secret from code, rotate it in the provider system, and store it in a secret manager."
    };
  }

  if (violation.type === "content") {
    return {
      title: "Replace insecure content",
      suggestion: "Refactor this code to use approved secure patterns and avoid committing sensitive literals."
    };
  }

  return null;
}

export function formatViolationWithSuggestion(
  violation: ComplianceViolation
): string {
  const location = violation.line ? ` (line ${violation.line})` : "";
  const base = `- **${violation.severity.toUpperCase()}** **${violation.type.toUpperCase()}**${location} — ${violation.message}`;

  const suggestion = getAutofixSuggestion(violation);

  if (!suggestion) {
    return base;
  }

  return `${base}
  - **Suggested fix:** ${suggestion.title}
  - **Guidance:** ${suggestion.suggestion}`;
}