import { parseComplianceShieldCommand } from "../src/utils/commandParser";

describe("parseComplianceShieldCommand", () => {
  test("returns null for non-command text", () => {
    expect(parseComplianceShieldCommand("hello world")).toBeNull();
  });

  test("defaults to help when only prefix is provided", () => {
    expect(parseComplianceShieldCommand("/compliance-shield")).toEqual({
      command: "help"
    });
  });

  test("parses help command", () => {
    expect(parseComplianceShieldCommand("/compliance-shield help")).toEqual({
      command: "help"
    });
  });

  test("parses status command", () => {
    expect(parseComplianceShieldCommand("/compliance-shield status")).toEqual({
      command: "status"
    });
  });

  test("parses history command", () => {
    expect(parseComplianceShieldCommand("/compliance-shield history")).toEqual({
      command: "history"
    });
  });

  test("parses scan-repo command", () => {
    expect(parseComplianceShieldCommand("/compliance-shield scan-repo")).toEqual({
      command: "scan-repo"
    });
  });

  test("parses rescan command", () => {
    expect(parseComplianceShieldCommand("/compliance-shield rescan")).toEqual({
      command: "rescan"
    });
  });

  test("returns unknown for unsupported command", () => {
    expect(parseComplianceShieldCommand("/compliance-shield dance")).toEqual({
      command: "unknown"
    });
  });
});