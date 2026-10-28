import { describe, expect, it } from "vitest";

import { formatDateTime, toIsoDateRange, toIsoDateTime, toLocalDateTimeInput } from "@/utils/date-utils.ts";

describe("date utils keep API wall-clock semantics", () => {
    it("keeps local datetime text without applying the browser timezone", () => {
        expect(toIsoDateTime("2026-10-28T09:30:00")).toBe("2026-10-28T09:30:00");
    });

    it("keeps explicit offsets unchanged", () => {
        expect(toIsoDateTime("2026-10-28T09:30:00+08:00")).toBe("2026-10-28T09:30:00+08:00");
        expect(toIsoDateTime("2026-10-28T01:30:00Z")).toBe("2026-10-28T01:30:00Z");
    });

    it("rejects invalid civil dates, times and offsets", () => {
        expect(() => toIsoDateTime("2026-02-30T09:30:00")).toThrow(RangeError);
        expect(() => toIsoDateTime("2026-10-28T24:00:00")).toThrow(RangeError);
        expect(() => toIsoDateTime("2026-10-28T09:30:00+19:00")).toThrow(RangeError);
        expect(() => toIsoDateTime("2026-10-28T09:30:00+18:30")).toThrow(RangeError);
        expect(() => toIsoDateTime("not-a-date")).toThrow(RangeError);
    });

    it("renders the server wall clock and offset without re-localizing", () => {
        expect(formatDateTime("2026-10-28T09:30:00+08:00")).toBe("2026-10-28 09:30:00 +08:00");
        expect(formatDateTime("2026-10-28T01:30:00Z")).toBe("2026-10-28 01:30:00 Z");
        expect(formatDateTime(null)).toBe("—");
    });

    it("strips offsets only for edit controls", () => {
        expect(toLocalDateTimeInput("2026-10-28T09:30:00+08:00")).toBe("2026-10-28T09:30:00");
        expect(() => toLocalDateTimeInput("2026-10-28")).toThrow(RangeError);
    });

    it("builds a full-day range without the browser timezone", () => {
        expect(toIsoDateRange(["2026-10-28", "2026-10-29"])).toEqual({
            start: "2026-10-28T00:00:00",
            end: "2026-10-29T23:59:59.999"
        });
    });
});
