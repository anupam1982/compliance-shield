import { ComplianceViolation } from "../types/rules";

export function groupViolationsByFileMap(
  violations: ComplianceViolation[]
): Record<string, ComplianceViolation[]> {
  return violations.reduce(
    (accumulator, violation) => {
      const file = violation.fileName || "unknown";

      if (!accumulator[file]) {
        accumulator[file] = [];
      }

      accumulator[file].push(violation);

      return accumulator;
    },
    {} as Record<string, ComplianceViolation[]>
  );
}