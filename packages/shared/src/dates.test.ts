import { describe, expect, it } from "vitest";
import {
  formatMonthLabel,
  formatDayShort,
  formatDayWithYear,
  formatMonthRange,
  formatMonthShort,
  isCalendarDate,
  isMonth,
  monthOf,
  monthsBetween,
  monthsEndingWith,
  monthRange,
  shiftDate,
  shiftMonth,
  todayIn,
} from "./dates";

describe("isCalendarDate", () => {
  it("accepts real dates, including leap days", () => {
    expect(isCalendarDate("2026-10-23")).toBe(true);
    expect(isCalendarDate("2028-02-29")).toBe(true);
  });

  it("rejects dates that don't exist", () => {
    expect(isCalendarDate("2026-02-29")).toBe(false);
    expect(isCalendarDate("2026-04-31")).toBe(false);
    expect(isCalendarDate("2026-13-01")).toBe(false);
  });

  it("rejects other shapes and implausible years", () => {
    expect(isCalendarDate("2026-1-5")).toBe(false);
    expect(isCalendarDate("23/10/2026")).toBe(false);
    expect(isCalendarDate("0026-10-23")).toBe(false);
    expect(isCalendarDate("")).toBe(false);
  });
});

describe("isMonth", () => {
  it("accepts YYYY-MM", () => {
    expect(isMonth("2026-01")).toBe(true);
    expect(isMonth("2026-12")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isMonth("2026-00")).toBe(false);
    expect(isMonth("2026-13")).toBe(false);
    expect(isMonth("2026-1")).toBe(false);
    expect(isMonth("2026-10-01")).toBe(false);
  });
});

describe("todayIn", () => {
  it("uses the given time zone's calendar, not UTC's", () => {
    // 20:00 UTC on the 23rd is already the 24th in Manila (UTC+8).
    const now = new Date("2026-10-23T20:00:00Z");
    expect(todayIn("Asia/Manila", now)).toBe("2026-10-24");
    expect(todayIn("UTC", now)).toBe("2026-10-23");
  });
});

describe("month helpers", () => {
  it("takes the month of a date", () => {
    expect(monthOf("2026-10-23")).toBe("2026-10");
  });

  it("gives each month's first and last day", () => {
    expect(monthRange("2026-10")).toEqual({ start: "2026-10-01", end: "2026-10-31" });
    expect(monthRange("2026-02")).toEqual({ start: "2026-02-01", end: "2026-02-28" });
    expect(monthRange("2028-02")).toEqual({ start: "2028-02-01", end: "2028-02-29" });
  });

  it("steps across year boundaries", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-10", 0)).toBe("2026-10");
  });

  it("labels a month", () => {
    expect(formatMonthLabel("2026-10", "en")).toBe("October 2026");
  });
});

describe("monthsEndingWith", () => {
  it("lists months oldest first, across a year boundary", () => {
    expect(monthsEndingWith("2026-02", 4)).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
  });
});

describe("formatMonthShort", () => {
  it("abbreviates the month", () => {
    expect(formatMonthShort("2026-10", "en")).toBe("Oct");
  });
});

describe("shiftDate", () => {
  it("steps across month and year boundaries", () => {
    expect(shiftDate("2026-10-03", -6)).toBe("2026-09-27");
    expect(shiftDate("2026-12-30", 3)).toBe("2027-01-02");
    expect(shiftDate("2028-02-28", 1)).toBe("2028-02-29");
  });
});

describe("formatDayShort", () => {
  it("shows the day and abbreviated month", () => {
    expect(formatDayShort("2026-10-05", "en-GB")).toBe("5 Oct");
  });
});

describe("formatDayWithYear", () => {
  it("includes the year and never shifts the day", () => {
    expect(formatDayWithYear("2026-10-05", "en-GB")).toBe("5 Oct 2026");
  });
});

describe("monthsBetween", () => {
  it("counts whole months, across years and backwards", () => {
    expect(monthsBetween("2026-10", "2026-10")).toBe(0);
    expect(monthsBetween("2026-11", "2027-02")).toBe(3);
    expect(monthsBetween("2027-02", "2026-11")).toBe(-3);
  });
});

describe("formatMonthRange", () => {
  it("names one month in full, and a range by its ends", () => {
    expect(formatMonthRange("2027-01", "2027-01", "en")).toBe("January 2027");
    expect(formatMonthRange("2027-01", "2027-03", "en")).toBe("Jan – Mar 2027");
    expect(formatMonthRange("2026-11", "2027-02", "en")).toBe("Nov 2026 – Feb 2027");
  });
});
