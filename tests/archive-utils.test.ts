import { describe, expect, it } from "vitest"
import { formatBytes, getSelectionState, parseCsvRows } from "@/lib/archive-utils"

describe("archive-utils", () => {
  it("formats bytes into readable units", () => {
    expect(formatBytes(512)).toBe("512 B")
    expect(formatBytes(2048)).toBe("2.00 KB")
    expect(formatBytes(2 * 1024 * 1024)).toBe("2.00 MB")
  })

  it("parses csv rows with row limit", () => {
    const rows = parseCsvRows("a,b\n1,2\n3,4", 2)
    expect(rows).toEqual([
      ["a", "b"],
      ["1", "2"],
    ])
  })

  it("returns selection state", () => {
    const paths = ["a.txt", "b.txt", "c.txt"]
    expect(getSelectionState(paths, new Set())).toBe("none")
    expect(getSelectionState(paths, new Set(["a.txt", "b.txt", "c.txt"]))).toBe("all")
    expect(getSelectionState(paths, new Set(["a.txt"]))).toBe("partial")
  })
})
