import { validateComplianceConfig } from "../src/utils/configValidator";

describe("validateComplianceConfig", () => {
  test("accepts undefined config", () => {
    expect(validateComplianceConfig(undefined)).toEqual({
      isValid: true,
      errors: []
    });
  });

  test("accepts valid minimal config", () => {
    const result = validateComplianceConfig({
      policy: "strict",
      scanMode: "full-file",
      minimumSeverityToFail: "high"
    });

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("rejects invalid policy", () => {
    const result = validateComplianceConfig({
      policy: "ultra-strict" as never
    });

    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain("policy");
  });

  test("rejects invalid scan mode", () => {
    const result = validateComplianceConfig({
      scanMode: "everything" as never
    });

    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain("scanMode");
  });

  test("rejects invalid severity", () => {
    const result = validateComplianceConfig({
      minimumSeverityToFail: "urgent" as never
    });

    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain("minimumSeverityToFail");
  });

  test("rejects invalid ignorePaths", () => {
    const result = validateComplianceConfig({
      ignorePaths: ["docs/", 123] as never
    });

    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain("ignorePaths");
  });

  test("rejects invalid numeric values", () => {
    const result = validateComplianceConfig({
      maxRepositoryFiles: -1
    });

    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain("maxRepositoryFiles");
  });

  test("rejects invalid command permissions", () => {
    const result = validateComplianceConfig({
      commandPermissions: {
        help: "everyone",
        status: "superadmin",
        "scan-repo": "write",
        rescan: "admin"
      } as never
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.some((error) => error.includes("commandPermissions.status"))).toBe(
      true
    );
  });
});