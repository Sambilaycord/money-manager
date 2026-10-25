import { describe, expect, it } from "vitest";
import { describeUserAgent } from "./devices";

describe("describeUserAgent", () => {
  it("names common browsers and systems", () => {
    expect(
      describeUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
      ),
    ).toBe("Chrome on Windows");
    expect(
      describeUserAgent(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
      ),
    ).toBe("Safari on iPhone");
    expect(
      describeUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
      ),
    ).toBe("Safari on Mac");
    expect(
      describeUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0"),
    ).toBe("Firefox on Windows");
  });

  it("tells Edge apart from the Chrome it is built on", () => {
    expect(
      describeUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0",
      ),
    ).toBe("Edge on Windows");
  });

  it("reads the mobile app's HTTP stacks as the app", () => {
    expect(describeUserAgent("okhttp/4.12.0")).toBe("Mobile app on Android");
    expect(describeUserAgent("MoneyManager/1 CFNetwork/1568.100.1 Darwin/24.0.0")).toBe(
      "Mobile app on iPhone",
    );
  });

  it("falls back for missing and unrecognised agents", () => {
    expect(describeUserAgent(null)).toBe("Unknown device");
    expect(describeUserAgent("node")).toBe("Web browser");
  });
});
