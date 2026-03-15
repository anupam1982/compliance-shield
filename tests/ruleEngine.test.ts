import {
  hasBlockingViolations,
  runComplianceChecks
} from "../src/rules/ruleEngine";
import { ComplianceRuleSet } from "../src/types/rules";

const baseRules: ComplianceRuleSet = {
  bannedFileIndicators: [{ value: ".pem", severity: "high" }],
  bannedContentIndicators: [{ value: "MD5", severity: "medium" }],
  secretPatterns: [
    {
      name: "Demo Token Pattern",
      pattern: "TEST_TOKEN_[A-Za-z0-9]+",
      severity: "high"
    }
  ],
  minimumSeverityToFail: "high",
  ignorePaths: [],
  ignoreIndicators: [],
  inlineIgnoreComment: "compliance-shield-ignore",
  scanMode: "diff",
  maxRepositoryFiles: 200,
  maxFileSizeKB: 200,
  parallelFileFetchLimit: 10,
  commandPermissions: {
    help: "everyone",
    status: "everyone",
    "scan-repo": "write",
    rescan: "write"
  }
};

describe("runComplianceChecks", () => {
  test("detects banned filename indicator", () => {
    const violations = runComplianceChecks(
      [{ filename: "secrets/test.pem", patch: "" }],
      baseRules
    );

    expect(violations.some((v) => v.type === "file" && v.indicator === ".pem")).toBe(true);
  });

  test("detects banned content indicator", () => {
    const violations = runComplianceChecks(
      [
        {
          filename: "src/hash.ts",
          patch: "@@ -0,0 +1 @@\n+const algo = 'MD5';"
        }
      ],
      baseRules
    );

    expect(violations.some((v) => v.type === "content" && v.indicator === "MD5")).toBe(
      true
    );
  });

  test("detects regex secret pattern", () => {
    const violations = runComplianceChecks(
      [
        {
          filename: "src/token.ts",
          patch: "@@ -0,0 +1 @@\n+const token = 'TEST_TOKEN_ABC123';"
        }
      ],
      baseRules
    );

    expect(
      violations.some((v) => v.type === "secret-pattern" && v.indicator === "Demo Token Pattern")
    ).toBe(true);
  });

  test("respects ignored paths", () => {
    const rules: ComplianceRuleSet = {
      ...baseRules,
      ignorePaths: ["docs/"]
    };

    const violations = runComplianceChecks(
      [
        {
          filename: "docs/readme.ts",
          patch: "@@ -0,0 +1 @@\n+const algo = 'MD5';"
        }
      ],
      rules
    );

    expect(violations).toHaveLength(0);
  });

  test("respects inline ignore comment", () => {
    const violations = runComplianceChecks(
      [
        {
          filename: "src/hash.ts",
          patch: "@@ -0,0 +1 @@\n+const algo = 'MD5'; // compliance-shield-ignore"
        }
      ],
      baseRules
    );

    expect(violations).toHaveLength(0);
  });
});

describe("hasBlockingViolations", () => {
  test("returns false when below threshold", () => {
    const result = hasBlockingViolations(
      [
        {
          type: "content",
          fileName: "src/hash.ts",
          indicator: "MD5",
          severity: "medium",
          message: "MD5 detected"
        }
      ],
      "high"
    );

    expect(result).toBe(false);
  });

  test("returns true when at threshold", () => {
    const result = hasBlockingViolations(
      [
        {
          type: "secret-pattern",
          fileName: "src/token.ts",
          indicator: "Demo Token Pattern",
          severity: "high",
          message: "Token detected"
        }
      ],
      "high"
    );

    expect(result).toBe(true);
  });
});