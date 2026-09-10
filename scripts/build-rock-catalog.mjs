#!/usr/bin/env node
import { createHash } from "node:crypto";
// Curated CC0 rock patches. Keep the original sample blobs and mapping sources;
// generated SFZs omit the upstream player-specific GUI/feedback controls.
import fs from "node:fs";
import path from "node:path";

const hash = (b) =>
  createHash("sha1")
    .update(`blob ${Buffer.byteLength(b)}\0`)
    .update(b)
    .digest("hex");
const instruments = [];
async function repository(repo, commit) {
  const r = await fetch(`https://api.github.com/repos/${repo}/git/trees/${commit}?recursive=1`);
  if (!r.ok) throw new Error(`${repo}: ${r.status}`);
  const j = await r.json(),
    files = new Map(j.tree.filter((x) => x.type === "blob").map((x) => [x.path, x]));
  const baseURL = `https://raw.githubusercontent.com/${repo}/${commit}/`;
  const text = async (file) => {
    const r = await fetch(baseURL + file);
    if (!r.ok) throw new Error(file);
    const t = await r.text();
    if (hash(t) !== files.get(file).sha) throw new Error(`Mapping checksum: ${file}`);
    return t;
  };
  return { repo, commit, files, baseURL, text };
}
function regions(text) {
  return text
    .split("<region>")
    .slice(1)
    .map((r) =>
      Object.fromEntries(
        [...r.matchAll(/^(\w+)=([^\r\n]+)/gm)].map((m) => [m[1], m[2].split(" //")[0].trim()]),
      ),
    );
}
function completeZones(regions, min, max) {
  const roots = [...new Set(regions.map((r) => Number(r.pitch_keycenter)))].sort((a, b) => a - b);
  return regions.map((r) => {
    const key = Number(r.pitch_keycenter),
      i = roots.indexOf(key);
    return {
      ...r,
      lokey: String(i ? Math.floor((roots[i - 1] + key) / 2) + 1 : min),
      hikey: String(i < roots.length - 1 ? Math.floor((key + roots[i + 1]) / 2) : max),
    };
  });
}
function add(repo, id, name, family, mapping, sfz, range, keys) {
  const files = [
    ...new Set(
      [...sfz.matchAll(/sample=([^\n]+)/g)].map((m) =>
        path.posix.normalize("Programs/" + m[1].trim().replaceAll("\\", "/")),
      ),
    ),
  ];
  const assets = [...new Set([...mapping, ...files])].map((p) => {
    const f = repo.files.get(p);
    if (!f) throw new Error(`Missing ${p}`);
    return { path: p, sha1: f.sha, bytes: f.size };
  });
  instruments.push({
    id,
    name,
    family,
    license: "CC0-1.0",
    range,
    keys,
    keyswitch: false,
    sfz: `Programs/clapper-${id}.sfz`,
    sfzText: sfz,
    sha1: hash(sfz),
    assets,
    bytes: assets.reduce((a, b) => a + b.bytes, 0),
    pack: id,
    version: repo.commit + "-clapper1",
    baseURL: repo.baseURL,
    source: `https://github.com/${repo.repo}`,
    licenseFile: { path: "LICENSE", sha1: repo.files.get("LICENSE").sha },
  });
}
const guitar = await repository(
  "sfzinstruments/karoryfer.black-and-green-guitars",
  "b3b3249d37dc977a1a297bd2dc053e6d9b6b805c",
);
const guitarMap = "Programs/modules/maps_green/ord.sfz";
const gr = completeZones(
  regions(await guitar.text(guitarMap)).filter(
    (r) =>
      r.sample?.match(/_mf_rr[12]\.wav$/) &&
      Number(r.pitch_keycenter) >= 40 &&
      Number(r.pitch_keycenter) <= 76,
  ),
  40,
  76,
);
const guitarSfz =
  "// CC0 Karoryfer Black and Green Guitars: medium-layer, two-RR adaptation.\n<global> ampeg_attack=0.004 ampeg_release=0.13\n" +
  gr
    .map(
      (r) =>
        `<region>\nsample=${r.sample}\nlokey=${r.lokey}\nhikey=${r.hikey}\npitch_keycenter=${r.pitch_keycenter}\nseq_length=2\nseq_position=${r.sample.includes("rr2") ? 2 : 1}\n`,
    )
    .join("\n");
add(
  guitar,
  "green-guitar",
  "Green hollowbody guitar · two round robins",
  "guitars",
  [guitarMap],
  guitarSfz,
  [40, 76],
  Array.from({ length: 37 }, (_, i) => 40 + i),
);
const bass = await repository(
  "sfzinstruments/karoryfer.big-little-bass",
  "4e92bdf54dcd2d6cfad968cc90542d5461c9b9fc",
);
const bassMap = "Programs/maps/p_map.sfz";
const br = completeZones(
  regions(await bass.text(bassMap)).filter(
    (r) =>
      r.sample?.match(/_rr[12]\.wav$/) && Number(r.pitch_keycenter) >= 35 && Number(r.pitch_keycenter) <= 60,
  ),
  35,
  60,
);
const bassSfz =
  "// CC0 Karoryfer Big Little Bass: plucked two-RR adaptation.\n<global> ampeg_attack=0.003 ampeg_release=0.12\n" +
  br
    .map(
      (r) =>
        `<region>\nsample=${r.sample}\nlokey=${r.lokey}\nhikey=${r.hikey}\npitch_keycenter=${r.pitch_keycenter}\nseq_length=2\nseq_position=${r.sample.includes("rr2") ? 2 : 1}\n`,
    )
    .join("\n");
add(
  bass,
  "little-bass",
  "Big Little Bass · plucked",
  "bass",
  [bassMap],
  bassSfz,
  [35, 60],
  Array.from({ length: 26 }, (_, i) => 35 + i),
);
const drums = await repository("sfzinstruments/virtuosity_drums", "9f04cf9a734527edfbb0a4eee1f674e45bbf71bc");
const pieces = [
  [36, "kick_snoff"],
  [38, "snare_center"],
  [42, "hh_closed"],
  [46, "hh_open"],
  [45, "ltom_center"],
  [47, "htom_center"],
  [49, "crash_crash"],
];
let drumSfz =
  "// CC0 Virtuosity Drums: overhead kit with GM note mapping.\n<global> loop_mode=one_shot ampeg_release=0.02\n";
const maps = [];
for (const [key, piece] of pieces) {
  const file = `Programs/mappings/oh/${piece}_map.sfz`;
  maps.push(file);
  drumSfz +=
    `\n<group> key=${key}${key === 42 || key === 46 ? " group=1 off_by=1" : ""}\n` + (await drums.text(file));
}
add(
  drums,
  "club-drums",
  "Virtuosity club kit · overhead",
  "drums",
  maps,
  drumSfz,
  [36, 49],
  pieces.map((p) => p[0]),
);
fs.writeFileSync(
  "packages/cli/assets/rock-instruments.json",
  JSON.stringify({ instruments }, null, 2) + "\n",
);
for (const i of instruments)
  console.log(`${i.id}: ${i.assets.length} assets, ${(i.bytes / 1048576).toFixed(1)} MiB`);
