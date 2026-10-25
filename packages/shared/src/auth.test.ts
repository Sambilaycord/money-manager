import { describe, expect, it } from "vitest";
import {
  emailProblem,
  nameProblem,
  passwordProblem,
  passwordRules,
  validateNewPassword,
  validatePasswordChange,
  validateSignIn,
  validateSignUp,
} from "./auth";

const GOOD_PASSWORD = "Sunrise2026";

describe("passwordRules", () => {
  it("reports each rule as met or not", () => {
    expect(passwordRules("abc").map((rule) => [rule.id, rule.met])).toEqual([
      ["length", false],
      ["lowercase", true],
      ["uppercase", false],
      ["number", false],
    ]);
    expect(passwordRules(GOOD_PASSWORD).every((rule) => rule.met)).toBe(true);
  });
});

describe("passwordProblem", () => {
  it("accepts a password meeting every rule", () => {
    expect(passwordProblem(GOOD_PASSWORD)).toBeNull();
  });

  it("names everything still missing", () => {
    expect(passwordProblem("sunrise")).toBe(
      "Your password needs at least 8 characters, an uppercase letter, a number.",
    );
  });

  it("rejects an empty password and one past bcrypt's 72 bytes", () => {
    expect(passwordProblem("")).toBe("Enter a password.");
    expect(passwordProblem(`Aa1${"x".repeat(70)}`)).toMatch(/too long/);
    // Multi-byte characters count by bytes, not letters: 25 × 3 bytes = 75.
    expect(passwordProblem(`Aa1${"€".repeat(25)}`)).toMatch(/too long/);
  });
});

describe("emailProblem", () => {
  it("accepts ordinary addresses, ignoring case and spaces", () => {
    expect(emailProblem(" Ana.Cruz+bills@Example.PH ")).toBeNull();
  });

  it("rejects missing and malformed addresses", () => {
    expect(emailProblem("")).toBe("Enter your email address.");
    expect(emailProblem("ana@example")).toMatch(/valid email/);
    expect(emailProblem("ana cruz@example.com")).toMatch(/valid email/);
    expect(emailProblem(`${"a".repeat(250)}@x.ph`)).toMatch(/valid email/);
  });
});

describe("nameProblem", () => {
  it("accepts names from any script with the punctuation names use", () => {
    for (const name of ["María José", "O'Brien", "Jean-Luc", "Ma. Cristina", "李小龍", "Ana  Cruz"]) {
      expect(nameProblem(name)).toBeNull();
    }
  });

  it("rejects empty names, digits, symbols, and stray punctuation", () => {
    expect(nameProblem("   ")).toBe("Enter your name.");
    for (const name of ["Ana2", "Ana <script>", "@ana", "-Ana", "Ana!"]) {
      expect(nameProblem(name)).toBe("Use letters, spaces, and ' - . only.");
    }
  });

  it("limits the length", () => {
    expect(nameProblem("A".repeat(121))).toMatch(/120 characters/);
  });
});

describe("validateSignUp", () => {
  const valid = {
    fullName: "  Ana   Cruz ",
    email: " Ana@Example.com",
    password: GOOD_PASSWORD,
    confirmPassword: GOOD_PASSWORD,
  };

  it("normalises a valid sign-up", () => {
    expect(validateSignUp(valid)).toEqual({
      ok: true,
      value: { fullName: "Ana Cruz", email: "ana@example.com", password: GOOD_PASSWORD },
    });
  });

  it("reports every field's problem at once", () => {
    const result = validateSignUp({ fullName: "", email: "nope", password: "short", confirmPassword: "x" });
    expect(result.ok).toBe(false);
    expect(!result.ok && Object.keys(result.fieldErrors).sort()).toEqual([
      "confirmPassword",
      "email",
      "fullName",
      "password",
    ]);
  });

  it("requires the retyped password to match", () => {
    const result = validateSignUp({ ...valid, confirmPassword: "Sunrise2025" });
    expect(!result.ok && result.fieldErrors).toEqual({ confirmPassword: "The passwords don't match." });
  });
});

describe("validateSignIn", () => {
  it("doesn't hold an existing password to today's rules", () => {
    expect(validateSignIn({ email: "ana@example.com", password: "old" }).ok).toBe(true);
  });

  it("requires an email and a password", () => {
    const result = validateSignIn({ email: "", password: "" });
    expect(!result.ok && result.fieldErrors).toEqual({
      email: "Enter your email address.",
      password: "Enter your password.",
    });
  });
});

describe("validateNewPassword", () => {
  it("applies the password rules and the match check", () => {
    expect(validateNewPassword({ password: GOOD_PASSWORD, confirmPassword: GOOD_PASSWORD }).ok).toBe(true);
    const result = validateNewPassword({ password: "weak", confirmPassword: "" });
    expect(!result.ok && Object.keys(result.fieldErrors).sort()).toEqual(["confirmPassword", "password"]);
  });
});

describe("validatePasswordChange", () => {
  const valid = { currentPassword: "OldPass1", password: GOOD_PASSWORD, confirmPassword: GOOD_PASSWORD };

  it("accepts a new password that differs from the current one", () => {
    expect(validatePasswordChange(valid)).toEqual({
      ok: true,
      value: { currentPassword: "OldPass1", password: GOOD_PASSWORD },
    });
  });

  it("requires the current password", () => {
    const result = validatePasswordChange({ ...valid, currentPassword: "" });
    expect(!result.ok && result.fieldErrors).toEqual({ currentPassword: "Enter your current password." });
  });

  it("refuses reusing the current password", () => {
    const result = validatePasswordChange({
      currentPassword: GOOD_PASSWORD,
      password: GOOD_PASSWORD,
      confirmPassword: GOOD_PASSWORD,
    });
    expect(!result.ok && result.fieldErrors.password).toMatch(/different/);
  });
});
