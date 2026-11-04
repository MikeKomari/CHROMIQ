import { describe, expect, it } from "vitest";

import { visionMatrices, visionModes, type VisionMode } from "@/lib/vision";

/**
 * The simulation is labelled in the UI as an approximation, not a diagnosis,
 * and these checks exist to keep it from quietly becoming something else: a
 * matrix that brightens or darkens the whole preview would look like a
 * contrast problem the user does not have.
 */

describe("visionModes", () => {
  it("offers normal vision first, so the default is no simulation", () => {
    expect(visionModes[0].value).toBe("none");
  });

  it("gives normal vision an empty note, because there is nothing to disclose", () => {
    expect(visionModes[0].note).toBe("");
  });

  it("gives every simulated mode a label and a note for the disclosure line", () => {
    for (const mode of visionModes.slice(1)) {
      expect(mode.label.length).toBeGreaterThan(0);
      expect(mode.note.length).toBeGreaterThan(0);
    }
  });

  it("has no duplicate values", () => {
    const values = visionModes.map((mode) => mode.value);
    expect(new Set(values).size).toBe(values.length);
  });

  it("names a matrix for every mode except normal vision and blur", () => {
    // Blur is an acuity simulation, not a colour one, so it has no matrix.
    const needing = visionModes
      .map((mode) => mode.value)
      .filter((value): value is VisionMode => value !== "none" && value !== "blur");
    expect(Object.keys(visionMatrices).sort()).toEqual([...needing].sort());
  });
});

describe("visionMatrices", () => {
  it.each(Object.entries(visionMatrices))("%s is a 3x3 matrix", (_name, matrix) => {
    expect(matrix).toHaveLength(3);
    for (const row of matrix) {
      expect(row).toHaveLength(3);
      for (const value of row) expect(Number.isFinite(value)).toBe(true);
    }
  });

  it.each(Object.entries(visionMatrices))(
    "%s preserves overall luminance, so it does not read as a contrast change",
    (_name, matrix) => {
      // Each row should sum to about 1: a row summing to 1.3 would brighten
      // that channel and make the preview look like a different palette.
      for (const row of matrix) {
        const sum = row.reduce((total, value) => total + value, 0);
        expect(sum).toBeGreaterThan(0.9);
        expect(sum).toBeLessThan(1.1);
      }
    },
  );

  it("maps achromatopsia to the same weights on every channel", () => {
    const [r, g, b] = visionMatrices.achromatopsia;
    expect(r).toEqual(g);
    expect(g).toEqual(b);
  });

  it("leaves the blue channel largely alone for protanopia and deuteranopia", () => {
    // Both are red-green conditions; a matrix that moved blue would be wrong.
    for (const name of ["protanopia", "deuteranopia"] as const) {
      expect(visionMatrices[name][2][2]).toBeGreaterThan(0.8);
    }
  });
});
