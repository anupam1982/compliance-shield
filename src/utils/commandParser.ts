export interface ComplianceShieldCommand {
  command: "scan-repo" | "help" | "unknown";
}

const COMMAND_PREFIX = "/compliance-shield";

export function parseComplianceShieldCommand(
  body: string
): ComplianceShieldCommand | null {
  const trimmedBody = body.trim();

  if (!trimmedBody.startsWith(COMMAND_PREFIX)) {
    return null;
  }

  const parts = trimmedBody.split(/\s+/);

  if (parts.length === 1) {
    return { command: "help" };
  }

  const subcommand = parts[1]?.toLowerCase();

  switch (subcommand) {
    case "scan-repo":
      return { command: "scan-repo" };
    case "help":
      return { command: "help" };
    default:
      return { command: "unknown" };
  }
}