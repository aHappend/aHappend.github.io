import {readFile, writeFile} from "node:fs/promises";
import {studies, gridPaths, wavePath, triangleSample} from "../project-study-models.js";

const path = (d, cls = "study-line", attributes = "") => `<path class="${cls}" d="${d}" ${attributes}/>`;
const rect = (x, y, width, height, cls = "study-panel", attributes = "") =>
  `<rect class="${cls}" x="${x}" y="${y}" width="${width}" height="${height}" rx="1" ${attributes}/>`;
const circle = (x, y, radius, cls = "study-line", attributes = "") =>
  `<circle class="${cls}" cx="${x}" cy="${y}" r="${radius}" ${attributes}/>`;
const multiply = (x, y) => circle(x, y, 10) + path(`M${x - 4} ${y - 4}l8 8m-8 0 8-8`, "study-warm");
const add = (x, y) => circle(x, y, 12) + path(`M${x - 5} ${y}h10m-5-5v10`, "study-warm");
const arrow = (x, y, width) => path(`M${x} ${y}h${width}m-5-4 5 4-5 4`, "study-route");
const bits = (value, count) => Array.from({length: count}, (_, i) => (value >>> (count - i - 1)) & 1);
const bytes = (value) => [24, 16, 8, 0].map((shift) => (value >>> shift) & 255);
const grid = (name, values, columns, x, y, size, scale = 1) =>
  `<g data-grid="${name}" data-columns="${columns}" data-x="${x}" data-y="${y}" data-size="${size}" data-scale="${scale}">`
  + gridPaths(values, columns, x, y, size, scale).map((d, i) =>
    path(d, "study-tone", `style="--tone:${(.06 + i * .125).toFixed(3)}"`)).join("") + "</g>";
const bars = (name, values, x, y, spacing, gain, vertical = false) =>
  `<g data-bars="${name}" data-x="${x}" data-y="${y}" data-spacing="${spacing}" data-gain="${gain}" data-vertical="${vertical}">`
  + values.map((value, i) => {
    const size = Math.abs(value) * gain;
    return vertical
      ? rect(x + i * spacing, y - Math.max(value, 0) * gain, 8, size, value < 0 ? "study-solid-warm" : "study-dot")
      : rect(x + Math.min(value, 0) * gain, y + i * spacing, size, 8, value < 0 ? "study-solid-warm" : "study-dot");
  }).join("") + "</g>";
const frame = (body, project, defs = "") => `<svg class="technical-study engineering-study" data-study="${project}" viewBox="0 0 640 240" fill="none" aria-hidden="true">
                <defs>${defs}</defs>
                ${body.join("\n                ")}
              </svg>`;
const stepWave = (values, x, y, spacing = 7) => values.map((value, i) =>
  `${i ? "H" : "M"}${x + i * spacing}${i ? "V" : " "}${y - value * 12}h${spacing}`).join("");
const columnOrder = (values) => Array.from({length: 16}, (_, i) => values[(i % 4) * 4 + Math.floor(i / 4)]);
const scenes = {};

scenes.vulcan = frame([
  path("M142 12v216M336 12v216M494 12v216", "study-guide"),
  path("M16 42h84l20 20v122H16zM100 42v20h20", "study-panel"),
  ...[0, 1, 2, 3, 4, 5, 6].map((i) => path(`M${28 + i % 3 * 8} ${72 + i * 13}h${[54, 38, 62, 46, 30, 54, 40][i]}`,
    i === 3 ? "study-warm" : "study-line")),
  rect(24, 101, 72, 9, "study-highlight", 'data-cursor="source"'),
  arrow(122, 112, 30),
  path("M166 71l16 10v62l-16 10z", "study-panel"),
  path("M152 90h14m-14 42h14M174 161v-13M182 112h27M231 112h24M283 112h40"),
  add(221, 112), rect(255, 91, 28, 42),
  path("m255 116 5 5-5 5M269 91V65H174v16M294 112v75H199v-65", "study-route"),
  rect(211, 55, 27, 18), path("M215 61h19m-19 6h12", "study-grid"),
  path("M155 195h174M155 200h174", "study-grid"),
  ...[166, 199, 221, 269, 294].map((x) => circle(x, 200, 2, "study-dot")),
  rect(259, 98, 20, 8, "study-dot", 'data-register="rtl"'),
  arrow(324, 112, 20),
  rect(351, 42, 132, 137),
  path("M359 70h116M359 102h116M359 134h116M359 166h116", "study-grid"),
  path(stepWave(studies.vulcan.clock, 361, 71), "study-line"),
  path(stepWave(studies.vulcan.valid, 361, 104), "study-line"),
  path(stepWave(studies.vulcan.valid.map((_, i, a) => i ? a[i - 1] : 0), 361, 137), "study-warm"),
  path(stepWave(studies.vulcan.valid.map((_, i, a) => i ? a[i - 1] : 0), 361, 167), "study-line"),
  path("M400 49v124", "study-focus", 'data-cursor="timing"'),
  ...[0, 1, 2, 3].map((i) => path(`m${368 + i * 28} 191 4 4 8-10`, "study-warm", `data-check="${i}"`)),
  arrow(484, 112, 17),
  rect(509, 45, 115, 135), rect(538, 76, 48, 48),
  ...[0, 1, 2, 3, 4, 5].map((i) => path(`M${542 + i * 8} 69v7m0 48v7M531 ${80 + i * 8}h7m48 0h7`, "study-grid")),
  grid("fabric", Array.from({length: 16}, (_, i) => i % 5 ? .25 : .9), 4, 542, 80, 10),
  path("M518 58h14v12h-14zM602 58h12v12h-12zM516 143h46v23h-46z", "study-line"),
  path("M518 100h13M593 101h18v39h-39v26M526 131v12M557 124v19", "study-route"),
  ...[0, 1, 2, 3].map((i) => rect(572 + i * 12, 151, 7, 15, "study-panel")),
  path("M565 181v33H68v-28", "study-route"),
  path("m74 192-6-6-6 6M328 208v12M318 214h20", "study-warm"),
  rect(546, 96, 8, 8, "study-solid-warm", 'data-cursor="fabric"'),
], "vulcan");

scenes.anvil = frame([
  path("M12 126h616", "study-guide"),
  ...[0, 1, 2, 3].map((i) => path(`M30 ${34 + i * 22}h79M75 ${28 + i * 22}v16`, "study-grid")),
  bars("input", studies.anvil.vectors[0], 75, 31, 22, 12),
  arrow(119, 70, 40),
  rect(175, 22, 76, 76),
  grid("matrix", studies.anvil.matrix.flat().map(Math.abs), 4, 179, 26, 17, 3),
  path(studies.anvil.matrix.flat().map((value, i) => value < 0
    ? `M${183 + i % 4 * 17} ${34 + Math.floor(i / 4) * 17}h7` : "").join(""), "study-warm"),
  rect(177, 24, 72, 18, "study-focus", 'data-cursor="matrix"'),
  arrow(253, 60, 29),
  ...[0, 1, 2, 3].map((i) => multiply(306, 29 + i * 23)),
  bars("products", [2, -2, 0, 3], 347, 25, 23, 4),
  ...[0, 1, 2, 3].map((i) => path(`M317 ${29 + i * 23}h12`, "study-route")),
  path("M387 29h12v3h8M387 52h12v-4h8M387 75h12v3h8M387 98h12v-4h8", "study-route"),
  add(415, 40), add(415, 86),
  path("M427 40h18v15h11M427 86h18v-15h11", "study-route"),
  add(465, 63), path("M477 63h11", "study-route"), rect(488, 42, 26, 44),
  path("m488 66 6 5-6 5M514 64h13", "study-line"),
  bars("output", studies.anvil.outputs[0], 565, 27, 22, 6),
  ...[0, 1, 2, 3].map((i) => path(`M529 ${31 + i * 22}h91M565 ${25 + i * 22}v16`, "study-grid")),
  grid("packed", studies.anvil.halfwords.slice(0, 2).flatMap((value) => bits(value, 16)), 32, 19, 165, 6),
  path("M19 157v-7h96v7M19 178v7h96v-7", "study-warm", 'data-cursor="storage-word"'),
  path("M25 162v12M55 162v12M121 162v12M151 162v12", "study-warm"),
  path("M214 168h30v-12h27M244 168v18h27", "study-route"),
  grid("extended", bits(studies.anvil.fixed[0], 32), 8, 276, 145, 8),
  path("M276 185h64M304 142v36", "study-grid"),
  arrow(345, 161, 42), multiply(403, 161),
  path("M403 151v-14h-27M413 161h29", "study-route"),
  add(455, 161), rect(484, 142, 28, 38), arrow(468, 161, 15),
  grid("accumulator", bits(studies.anvil.fixedProducts[0], 32), 8, 486, 150, 3),
  path("m484 163 5 5-5 5M512 161h14v43h-71v-31", "study-route"),
  path("M541 196h86M584 137v69", "study-grid"),
  bars("quantized", studies.anvil.fixedProducts.map((value) => value / 65536), 541, 196, 22, 16, true),
  path("M20 219h192M276 219h64M387 219h126M541 219h86", "study-grid"),
], "anvil");

scenes.rivet = frame([
  path("M12 113h616", "study-guide"),
  ...studies.rivet.aes.map((state, i) => rect(15 + i * 127, 19, 70, 70)
    + grid(`aes-${i}`, columnOrder(state), 4, 16 + i * 127, 20, 17, 255)
    + (i < 4 ? arrow(87 + i * 127, 54, 52) : "")),
  rect(13, 17, 74, 74, "study-focus", 'data-cursor="aes"'),
  ...Array.from({length: 16}, (_, i) => rect(20 + i % 4 * 17, 24 + Math.floor(i / 4) * 17,
    8, 8, "study-solid-warm", `data-byte="${i}"`)),
  grid("round-key", [0xd6, 0xaa, 0x74, 0xfd, 0xd2, 0xaf, 0x72, 0xfa, 0xda, 0xa6, 0x78, 0xf1, 0xd6, 0xab, 0x76, 0xfe], 8, 464, 94, 7, 255),
  circle(487, 54, 7, "study-panel"), path("M482 54h10m-5-5v10M500 94V76h-13V61", "study-warm"),
  grid("schedule", studies.rivet.sha.words.map((word) => word >>> 24), 16, 16, 141, 8, 255),
  rect(15, 140, 130, 34, "study-outline"),
  arrow(147, 157, 24),
  path("M181 140h32v28h-32zM230 164h32v28h-32z", "study-panel"),
  path("M187 148h18v11h-15m3-4-4 4 4 4M236 172h18v11h-15m3-4-4 4 4 4", "study-line"),
  path("M178 157h-7v44h68M214 154h19v-22h52v40M262 178h11M194 169v9h36", "study-route"),
  add(285, 184), path("M297 184h18V155h12", "study-route"),
  ...studies.rivet.sha.rounds[20].map((word, i) => rect(327 + i * 36, 131, 22, 60)
    + grid(`sha-${i}`, bytes(word), 1, 332 + i * 36, 137, 12, 255)
    + path(`M${338 + i * 36} 191v15`, "study-route")),
  path("M338 206h252v18H197v-55", "study-route"),
  ...Array.from({length: 8}, (_, i) => circle(338 + i * 36, 206, 3, "study-dot")),
  rect(18, 191, 125, 16, "study-outline"),
  grid("digest", studies.rivet.sha.digest.map((word) => word >>> 24), 8, 19, 191, 15, 255),
], "rivet");

const waveDefs = ["input", "fir", "iir"].map((name, i) =>
  `<clipPath id="billet-${name}-window">${rect(i ? 512 : 14, i === 2 ? 147 : 24, 112, 86)}</clipPath>`).join("");
const wave = (name, values, x, y, width, amplitude) =>
  `<g clip-path="url(#billet-${name}-window)"><g data-wave="${name}">`
  + path(wavePath([...values, ...values, values[0]], x, y, width * 2, amplitude),
    name === "iir" ? "study-warm" : "study-line") + "</g></g>";
const staticTaps = studies.billet.coefficients.map((_, i) => studies.billet.signal[(112 - i + 128) % 128]);
scenes.billet = frame([
  path("M14 68h113M14 31v75M512 67h112M512 192h112", "study-grid"),
  wave("input", studies.billet.signal, 14, 68, 128, 32),
  path("M128 68h40M128 68v127h75", "study-route"),
  ...[0, 1, 2, 3, 4].map((i) => rect(168 + i * 55, 54, 27, 28)
    + path(`m${168 + i * 55} 69 4 4-4 4${i < 4 ? `M${195 + i * 55} 68h28` : ""}M${181 + i * 55} 82v28`, "study-line")
    + multiply(181 + i * 55, 120)
    + (i ? path(`M${181 + i * 55} 130v9M${134 + i * 55} 147h39`, "study-route")
      + circle(181 + i * 55, 147, 8)
      + path(`M${177 + i * 55} 147h8m-4-4v8`, "study-warm")
      : path("M181 130v17h8", "study-route"))),
  bars("taps", staticTaps, 175, 46, 55, 18, true),
  bars("products", staticTaps.map((value, i) => value * studies.billet.coefficients[i]), 194, 132, 55, 28, true),
  path("M409 147h41M478 147h14V68h19", "study-route"),
  rect(450, 133, 28, 28), path("m450 148 4 4-4 4"),
  wave("fir", studies.billet.filtered, 512, 67, 128, 42),
  multiply(213, 195), path("M223 195h81", "study-route"), add(316, 195),
  path("M328 195h58M414 195h97", "study-route"), rect(386, 180, 28, 30),
  path("m386 195 4 4-4 4M428 195v31h-65m-20 0h-63v-19h36", "study-feedback"),
  multiply(353, 226),
  grid("iir-feed", [1, 0, 0, 0], 4, 201, 170, 6),
  grid("iir-feedback", [1, 1, 1, 0], 4, 341, 204, 6),
  wave("iir", studies.billet.recursive, 512, 192, 128, 32),
], "billet", waveDefs);

const staticPixel = studies.swage.scaled[85];
scenes.swage = frame([
  rect(17, 29, 98, 98), grid("source", studies.swage.pixels, 8, 18, 30, 12),
  rect(42, 54, 24, 24, "study-focus", 'data-cursor="kernel"'),
  ...[0, 1, 2, 3].map((i) => path(`M120 ${44 + i * 29}h54M194 ${44 + i * 29}h19`, "study-route")
    + multiply(225, 44 + i * 29)),
  bars("weights", staticPixel.weights, 164, 34, 29, 40),
  path("M235 44h45v20h19M235 73h64M235 102h45v23h19M235 131h64", "study-route"),
  add(312, 69), add(312, 128),
  path("M324 69h26v27h20M324 128h26v-20h20", "study-route"), add(383, 102),
  arrow(395, 102, 70), rect(469, 33, 146, 146),
  grid("scaled", studies.swage.scaled.map((sample) => sample.value), 16, 470, 34, 9),
  rect(515, 79, 9, 9, "study-focus", 'data-cursor="pixel"'),
  path("M470 97h144", "study-warm", 'data-cursor="scan" transform="translate(0 -18)"'),
  grid("neighbors", staticPixel.neighbors, 2, 154, 167, 24),
  path("M18 170h96M18 165v10M114 165v10M66 166v8M225 167h198M225 203h198", "study-grid"),
  bars("contributions", staticPixel.neighbors.map((value, i) => value * staticPixel.weights[i]), 232, 200, 47, 82, true),
  path("M470 208h144m-144-4v8m144-8v8", "study-grid"),
], "swage");

const symbolStrip = (name, values, x, y, step = 18) => `<g data-symbols="${name}" data-x="${x}" data-y="${y}" data-step="${step}">`
  + values.map((value, i) => `<g data-symbol="${i}">${rect(x + i * step, y, step - 2, 15, "study-outline")}`
    + bits(value, 8).map((bit, k) => bit ? rect(x + i * step + 2 + k % 4 * 3, y + 3 + Math.floor(k / 4) * 5,
      2, 3, "study-dot") : "").join("") + "</g>").join("") + "</g>";
scenes.bellows = frame([
  symbolStrip("message", studies.bellows.message, 20, 25, 16),
  path("M20 48h592M20 92h592", "study-grid"),
  rect(19, 22, 66, 21, "study-focus", 'data-cursor="literal"'),
  symbolStrip("history", studies.bellows.message, 20, 97, 16),
  rect(19, 94, 66, 21, "study-focus", 'data-cursor="match"'),
  path("M27 92V69h64v-25", "study-warm", 'data-reference="match"'),
  path("m24 86 5 6 5-6M20 135h592", "study-guide"),
  rect(19, 152, 98, 29),
  grid("token", bits(0x48, 8), 8, 20, 154, 12), path("M68 150v33", "study-warm"),
  arrow(120, 166, 32), rect(163, 152, 130, 21),
  grid("offset", bits(4, 16), 16, 164, 154, 8),
  path("M164 182h128m-128-4v8m128-8v8", "study-grid"),
  arrow(299, 166, 23),
  symbolStrip("encoded", studies.bellows.encoded, 326, 154, 16),
  symbolStrip("decoded", studies.bellows.message, 20, 213, 16),
  path("M611 178v20H20v11", "study-feedback"),
], "bellows");

const coverage = [];
for (let i = 0; i < 192; i++) {
  const sample = triangleSample(studies.crucible.vertices, i % 16 + .5, Math.floor(i / 16) + .5);
  if (sample.inside) coverage.push(`M${19 + i % 16 * 14} ${23 + Math.floor(i / 16) * 14}h12v12h-12z`);
}
scenes.crucible = frame([
  ...Array.from({length: 17}, (_, i) => path(`M${18 + i * 14} 22v168`, i % 4 ? "study-grid" : "study-route")),
  ...Array.from({length: 13}, (_, i) => path(`M18 ${22 + i * 14}h224`, i % 4 ? "study-grid" : "study-route")),
  path(coverage.join(""), "study-fill", 'data-coverage=""'),
  path("M46 36 214 64 102 176z", "study-line"),
  ...[[46, 36], [214, 64], [102, 176]].map(([x, y]) => circle(x, y, 3, "study-dot")),
  rect(101, 91, 14, 14, "study-focus", 'data-cursor="fragment"'),
  path("M108 93v-10m-5 5h10", "study-warm", 'data-cursor="sample"'),
  ...[0, 1, 2].map((i) => path(`M280 ${47 + i * 48}h102M323 ${30 + i * 48}v33`, "study-grid")
    + rect(379, 38 + i * 48, 12, 12, "study-dot", `data-edge="${i}"`)),
  bars("edges", [40, 30, 42], 323, 40, 48, .45),
  path("M392 44h12v34h11M392 92h23M392 140h12v-30h11", "study-route"),
  path("M415 68h19a26 26 0 0 1 0 52h-19z", "study-panel"),
  arrow(461, 94, 24), rect(486, 79, 27, 30), path("m486 96 4 4-4 4"),
  arrow(515, 94, 21), rect(539, 33, 77, 133),
  grid("fragments", Array.from({length: 32}, (_, i) => i / 32), 4, 545, 40, 16),
  path("M242 204h73M315 204h300M545 170v34", "study-route"),
  ...Array.from({length: 8}, (_, i) => rect(327 + i * 32, 193, 24, 22, "study-panel")),
  bars("depth", [.2, .8, .4, .65], 20, 225, 57, 25, true),
], "crucible");

scenes.furnace = frame([
  ...[0, 1, 2, 3].map((lane) =>
    rect(18, 30 + lane * 44, 90, 26)
    + grid(`queue-${lane}`, [1, .6, .2, 0], 4, 20, 32 + lane * 44, 22)
    + path(`M108 ${44 + lane * 44}h240`, "study-route")
    + rect(139, 38 + lane * 44, 12, 12, "study-dot", `data-request="${lane}"`)
    + path(`M${118 + lane * 14} ${44 + lane * 44}v${192 - lane * 47}H${196 + lane * 10}v-10`, "study-grid")),
  path("M348 18l44 34v112l-44 38z", "study-panel"),
  ...[0, 1, 2, 3].map((i) => path(`M354 ${44 + i * 44}l32 ${64 - i * 44}`, "study-grid")),
  path("M108 44h246l32 64h44", "study-active-route", 'data-route="grant"'),
  rect(195, 185, 42, 42), grid("priority", Array.from({length: 16}, (_, i) => i % 5 ? .08 : .7), 4, 196, 186, 10),
  path("M240 206h129v-22", "study-warm"),
  arrow(392, 108, 38), rect(431, 88, 39, 40),
  grid("held", bits(0, 16), 4, 435, 92, 8),
  arrow(471, 108, 38), rect(511, 79, 100, 100),
  grid("memory", Array.from({length: 64}, (_, i) => i < 24 ? (i % 4 + 1) / 4 : 0), 8, 513, 81, 12),
  path("M610 181v24H450v-76", "study-feedback"),
  rect(476, 199, 12, 12, "study-dot", 'data-ready=""'),
  path("M424 36h194M424 62h194", "study-grid"),
  path(stepWave(Array(16).fill(1), 426, 37, 12), "study-line"),
  path(stepWave(Array.from({length: 16}, (_, i) => ![5, 6, 13, 14, 15].includes(i)), 426, 63, 12), "study-warm"),
  path("M428 21v47", "study-focus", 'data-cursor="bus-clock"'),
  rect(426, 104, 8, 8, "study-solid-warm", 'data-cursor="beat"'),
], "furnace");

scenes.sable = frame([
  ...[0, 1, 2, 3].map((lane) => {
    const y = 35 + lane * 53, order = studies.sable.streams[lane].slice(1).map((state) => state.incoming);
    return symbolStrip(`arrival-${lane}`, order, 20, y - 16, 18)
      + path(`M20 ${y + 4}h595`, "study-route")
      + rect(232, y - 17, 178, 30)
      + grid(`window-${lane}`, studies.sable.streams[lane][4].slots, 8, 233, y - 16, 22)
      + symbolStrip(`release-${lane}`, [0, 1, 2, 3, 4, 5, 6, 7], 455, y - 16, 20)
      + `<g data-arrival="${lane}" transform="translate(180 ${y + 4})">${rect(0, -6, 18, 14)}`
      + grid(`packet-${lane}`, bits(order[0], 3), 3, 2, -2, 4) + "</g>"
      + rect(19, y - 18, 18, 19, "study-focus", `data-cursor="sable-source-${lane}"`)
      + path(`M${233 + studies.sable.streams[lane][4].base * 22} ${y + 17}l-4 6h8z`, "study-solid-warm", `data-ack="${lane}"`)
      + path(`M410 ${y + 19}H184v-9m-4 4 4-4 4 4`, "study-feedback")
      + grid(`ack-${lane}`, studies.sable.streams[lane][4].slots, 8, 455, y + 12, 6);
  }),
], "sable");

const file = new URL("../index.html", import.meta.url);
const original = await readFile(file, "utf8");
let updated = original;
for (const [project, svg] of Object.entries(scenes)) {
  const pattern = new RegExp(`(<article\\b[^>]*data-project="${project}"[\\s\\S]*?)(<svg\\b[\\s\\S]*?<\\/svg>)`);
  if (!pattern.test(updated)) throw new Error(`Missing project study: ${project}`);
  updated = updated.replace(pattern, (_, prefix) => prefix + svg);
}
if (process.argv.includes("--check")) {
  if (original !== updated) throw new Error("Project SVGs are stale. Run node scripts/build_project_studies.mjs.");
  console.log("Nine engineering-study SVGs match their generator.");
} else {
  await writeFile(file, updated);
  console.log("Generated nine detailed project studies; reference course diagrams are unchanged.");
}
