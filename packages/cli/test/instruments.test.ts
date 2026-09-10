import { expect, it } from "vitest";
import { blobHash, catalog, instrument, instrumentProvenance, packRoot } from "../src/instruments.ts";

it("keeps rock patches pinned, isolated and licensed", () => {
  expect(catalog.instruments).toHaveLength(78);
  for (const id of ["green-guitar", "little-bass", "club-drums"]) {
    const p = instrument(id);
    expect(p.license).toBe("CC0-1.0");
    expect(blobHash(Buffer.from(p.sfzText!))).toBe(p.sha1);
    expect(p.baseURL).toContain("raw.githubusercontent.com");
    expect(p.licenseFile?.sha1).toHaveLength(40);
    expect(instrumentProvenance(p).source).toContain("sfzinstruments");
    expect(packRoot(p)).toContain(p.version!);
    expect(p.assets.every((a) => a.sha1.length === 40 && a.bytes > 0)).toBe(true);
  }
  expect(packRoot(instrument("green-guitar"))).not.toBe(packRoot(instrument("vsupright1")));
  expect(instrument("club-drums").keys).toEqual([36, 38, 42, 46, 45, 47, 49]);
  for (const id of ["green-guitar", "little-bass"]) {
    const p = instrument(id),
      regions = p.sfzText!.split("<region>").slice(1);
    for (const key of p.keys!)
      expect(
        regions.some(
          (r) => key >= Number(/lokey=(\d+)/.exec(r)![1]) && key <= Number(/hikey=(\d+)/.exec(r)![1]),
        ),
        `${id} key ${key}`,
      ).toBe(true);
  }
});
