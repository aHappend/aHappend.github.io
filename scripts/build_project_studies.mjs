import {readFile, writeFile} from "node:fs/promises";
import {studies, gridPaths, wavePath, stepWave, triangleSample} from "../project-study-models.js";

const path = (d, cls = "study-line", attributes = "") => `<path class="${cls}" d="${d}" ${attributes}/>`;
const rect = (x, y, width, height, cls = "study-panel", attributes = "") =>
  `<rect class="${cls}" x="${x}" y="${y}" width="${width}" height="${height}" rx="1" ${attributes}/>`;
const circle = (x, y, radius, cls = "study-line", attributes = "") =>
  `<circle class="${cls}" cx="${x}" cy="${y}" r="${radius}" ${attributes}/>`;
const multiply = (x, y) => circle(x, y, 10) + path(`M${x - 4} ${y - 4}l8 8m-8 0 8-8`, "study-warm");
const add = (x, y) => circle(x, y, 12) + path(`M${x - 5} ${y}h10m-5-5v10`, "study-warm");
const sumPair = (x, y, inputs, bend) => {
  const portX = +(x - Math.sqrt(12 ** 2 - 6 ** 2)).toFixed(3);
  return `<g data-adder="">` + inputs.map(([sx, sy], i) =>
    path(`M${sx} ${sy}H${bend}V${y + (i ? 6 : -6)}H${portX}`, "study-route", 'data-sum-input=""')).join("")
    + add(x, y) + "</g>";
};
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
const columnOrder = (values) => Array.from({length: 16}, (_, i) => values[(i % 4) * 4 + Math.floor(i / 4)]);
const scenes = {};

scenes.vulcan = frame([
  path("M142 12v216M336 12v216M494 12v216", "study-guide"),
  path("M16 42h84l20 20v120H16zM100 42v20h20", "study-panel"),
  ...[0, 1, 2, 3, 4, 5, 6].map((i) => path(`M${28 + i % 3 * 8} ${72 + i * 13}h${[54, 38, 62, 46, 30, 54, 40][i]}`,
    i === 3 ? "study-warm" : "study-line")),
  rect(24, 101, 88, 9, "study-highlight", 'data-cursor="source"'),
  arrow(120, 112, 30), rect(150, 42, 178, 140),
  path("M166 71l16 10v62l-16 10z", "study-panel"),
  path("M152 90h14m-14 42h14M174 161v-13M182 112h27M233 112h22M283 112h45"),
  add(221, 112), rect(255, 91, 28, 42),
  path("m255 116 5 5-5 5M269 91V65H174v11M294 112v56H221v-44", "study-route"),
  rect(211, 55, 27, 18), path("M215 61h19m-19 6h12", "study-grid"),
  rect(259, 98, 20, 8, "study-dot", 'data-register="rtl"'),
  arrow(328, 112, 23),
  rect(351, 42, 132, 140),
  path("M359 70h116M359 102h116M359 134h116M359 166h116", "study-grid"),
  path(stepWave(studies.vulcan.clock, 361, 71), "study-line"),
  path(stepWave(studies.vulcan.valid, 361, 104), "study-line"),
  path(stepWave(studies.vulcan.valid.map((_, i, a) => i ? a[i - 1] : 0), 361, 137), "study-warm"),
  path(stepWave(studies.vulcan.valid.map((_, i, a) => i ? a[i - 1] : 0), 361, 167), "study-line"),
  path("M400 49v124", "study-focus", 'data-cursor="timing"'),
  ...[0, 1, 2, 3].map((i) => path(`m${368 + i * 28} 191 4 4 8-10`, "study-warm", `data-check="${i}"`)),
  arrow(483, 112, 26),
  rect(509, 42, 115, 140), rect(538, 76, 48, 48),
  ...[0, 1, 2, 3, 4, 5].map((i) => path(`M${542 + i * 8} 69v7m0 48v7M531 ${80 + i * 8}h7m48 0h7`, "study-grid")),
  grid("fabric", Array.from({length: 16}, (_, i) => i % 5 ? .25 : .9), 4, 542, 80, 10),
  path("M518 58h14v12h-14zM602 58h12v12h-12zM516 143h46v23h-46z", "study-line"),
  path("M518 100h13M593 101h18v39h-39v26M526 131v12M557 124v19", "study-route"),
  ...[0, 1, 2, 3].map((i) => rect(572 + i * 12, 151, 7, 15, "study-panel")),
  path("M565 182v32H68v-32", "study-route"),
  path("m74 188-6-6-6 6", "study-warm"),
  rect(543, 81, 8, 8, "study-solid-warm", 'data-cursor="fabric"'),
], "vulcan");

scenes.anvil = frame([
  path("M12 126h616", "study-guide"),
  ...[0, 1, 2, 3].map((i) => path(`M30 ${27 + i * 22}h79M75 ${19 + i * 22}v16`, "study-grid")),
  bars("input", studies.anvil.vectors[0], 75, 23, 22, 12),
  arrow(119, 60, 56),
  rect(175, 22, 76, 76),
  grid("matrix", studies.anvil.matrix.flat().map(Math.abs), 4, 179, 26, 17, 3),
  path(studies.anvil.matrix.flat().map((value, i) => value < 0
    ? `M${183 + i % 4 * 17} ${34 + Math.floor(i / 4) * 17}h7` : "").join(""), "study-warm"),
  rect(178, 26, 70, 17, "study-focus", 'data-cursor="matrix"'),
  path("M251 60h28M279 27v66", "study-route"),
  ...[0, 1, 2, 3].map((i) => path(`M279 ${27 + i * 22}h17`, "study-route")),
  ...[0, 1, 2, 3].map((i) => multiply(306, 27 + i * 22)),
  sumPair(415, 38, [[316, 27], [316, 49]], 395),
  sumPair(415, 82, [[316, 71], [316, 93]], 395),
  sumPair(465, 60, [[427, 38], [427, 82]], 445),
  bars("products", [2, -2, 0, 3], 347, 23, 22, 4),
  path("M477 60h11", "study-route"), rect(488, 38, 26, 44),
  path("m488 64 6 5-6 5M514 60h15", "study-line"),
  bars("output", studies.anvil.outputs[0], 565, 23, 22, 6),
  ...[0, 1, 2, 3].map((i) => path(`M529 ${27 + i * 22}h91M565 ${19 + i * 22}v16`, "study-grid")),
  rect(24, 144, 136, 48, "study-panel", 'data-box="storage"'),
  grid("packed", bits(studies.anvil.halfwords[0], 16), 16, 28, 160, 8),
  path("M36 152v24M76 152v24", "study-warm"),
  ...[0, 1, 2, 3].map((i) => rect(56 + i * 24, 200, 16, 3, "study-fill")),
  rect(56, 200, 16, 3, "study-solid-warm", 'data-cursor="storage-word"'),
  arrow(160, 168, 46), rect(206, 144, 96, 48, "study-panel", 'data-box="conversion"'),
  grid("extended", bits(studies.anvil.fixed[0], 32), 8, 214, 148, 10),
  path("M214 168h80", "study-grid"),
  arrow(302, 168, 50), multiply(362, 168),
  rect(334, 132, 42, 20), grid("activation", bytes(98304), 4, 338, 138, 8, 255),
  path("M362 152v6M372 168h48", "study-route"),
  add(432, 168), arrow(444, 168, 34),
  rect(478, 148, 40, 40, "study-panel", 'data-box="accumulator"'),
  grid("accumulator", bytes(studies.anvil.fixedProducts[0]), 2, 482, 152, 16, 255),
  path("M518 168h10v46h-96v-34", "study-feedback"),
  path("M540 190h80M540 144v64", "study-grid"),
  bars("quantized", studies.anvil.fixedProducts.map((value) => value / 65536), 546, 190, 20, 14, true),
], "anvil");

scenes.rivet = frame([
  path("M12 113h616", "study-guide"),
  ...studies.rivet.aes.map((state, i) => rect(15 + i * 127, 19, 70, 70)
    + grid(`aes-${i}`, columnOrder(state), 4, 16 + i * 127, 20, 17, 255)
    + (i < 4 ? path(`M${85 + i * 127} 54h57`, "study-route", `data-aes-link="${i}"`)
      + path(`m${137 + i * 127} 50 5 4-5 4`, "study-route") : "")),
  rect(13, 17, 74, 74, "study-focus", 'data-cursor="aes"'),
  ...Array.from({length: 16}, (_, i) => rect(17.5 + i % 4 * 17, 21.5 + Math.floor(i / 4) * 17,
    14, 14, "study-cell-focus", `data-byte="${i}" opacity="0"`)),
  circle(113, 54, 2.5, "study-solid-warm", 'data-cursor="aes-transfer"'),
  grid("round-key", [0xd6, 0xaa, 0x74, 0xfd, 0xd2, 0xaf, 0x72, 0xfa, 0xda, 0xa6, 0x78, 0xf1, 0xd6, 0xab, 0x76, 0xfe], 8, 464, 94, 7, 255),
  circle(487, 54, 7, "study-panel"), path("M482 54h10m-5-5v10M500 94V76h-13V61", "study-warm"),
  grid("schedule", studies.rivet.sha.words.map((word) => word >>> 24), 16, 16, 141, 8, 255),
  rect(15, 140, 130, 34, "study-outline"),
  arrow(145, 157, 36),
  path("M181 140h32v28h-32zM230 164h32v28h-32z", "study-panel"),
  path("M187 148h18v11h-15m3-4-4 4 4 4M236 172h18v11h-15m3-4-4 4 4 4", "study-line"),
  path("M162 157v44h84v-9M213 154h20v-22h52v40M262 178h6v6h5M194 168v10h36", "study-route"),
  add(285, 184), path("M297 184h18V155h12", "study-route"),
  ...studies.rivet.sha.rounds[20].map((word, i) => rect(327 + i * 36, 131, 22, 60)
    + grid(`sha-${i}`, bytes(word), 1, 332 + i * 36, 137, 12, 255)
    + path(`M${338 + i * 36} 191v15`, "study-route")),
  path("M338 206h252v18H197v-56", "study-route"),
  ...Array.from({length: 8}, (_, i) => circle(338 + i * 36, 206, 3, "study-dot")),
  rect(18, 191, 125, 16, "study-outline"),
  grid("digest", studies.rivet.sha.digest.map((word) => word >>> 24), 8, 19, 191, 15, 255),
], "rivet");

const waveDefs = ["input", "fir", "iir"].map((name, i) =>
  `<clipPath id="billet-${name}-window">${rect(i ? 512 : 14, i === 2 ? 139 : 24, 112, 86)}</clipPath>`).join("");
const wave = (name, values, x, y, width, amplitude) =>
  `<g clip-path="url(#billet-${name}-window)"><g data-wave="${name}">`
  + path(wavePath([...values, ...values, values[0]], x, y, width * 2, amplitude),
    name === "iir" ? "study-warm" : "study-line") + "</g></g>";
const staticTaps = studies.billet.coefficients.map((_, i) => studies.billet.signal[(112 - i + 128) % 128]);
scenes.billet = frame([
  path("M14 68h113M14 31v75M512 67h112M512 181h112", "study-grid"),
  wave("input", studies.billet.signal, 14, 68, 128, 32),
  path("M126 68h42M128 68v113h75", "study-route"),
  ...[0, 1, 2, 3, 4].map((i) => rect(168 + i * 55, 54, 27, 28)
    + path(`m${168 + i * 55} 69 4 4-4 4${i < 4 ? `M${195 + i * 55} 68h28` : ""}M${181 + i * 55} 82v28`, "study-line")
    + multiply(181 + i * 55, 120)
    + (i ? path(`M${181 + i * 55} 130v9M${134 + i * 55} 147h39`, "study-route")
      + circle(181 + i * 55, 147, 8)
      + path(`M${177 + i * 55} 147h8m-4-4v8`, "study-warm")
      : path("M181 130v17h8", "study-route"))),
  ...[0, 1, 2, 3, 4].map((i) => path(`M${171 + i * 55} 32h20`, "study-grid")),
  bars("taps", staticTaps, 177, 32, 55, 14, true),
  bars("products", staticTaps.map((value, i) => value * studies.billet.coefficients[i]), 194, 132, 55, 28, true),
  path("M409 147h41M478 147h16V67h18", "study-route"),
  rect(450, 133, 28, 28), path("m450 148 4 4-4 4"),
  wave("fir", studies.billet.filtered, 512, 67, 128, 42),
  multiply(213, 181), path("M223 181h81", "study-route"), add(316, 181),
  path("M328 181h58M414 181h98", "study-route"), rect(386, 166, 28, 30),
  path("m386 183 4 4-4 4M428 181v33h-65m-20 0h-63v-21h36", "study-feedback"),
  multiply(353, 214),
  grid("iir-feed", [1, 0, 0, 0], 4, 201, 158, 6),
  grid("iir-feedback", [1, 1, 1, 0], 4, 341, 196, 6),
  wave("iir", studies.billet.recursive, 512, 181, 128, 32),
], "billet", waveDefs);

const staticPixel = studies.swage.scaled[85];
scenes.swage = frame([
  rect(17, 47, 98, 98, "study-panel", 'data-box="source"'),
  grid("source", studies.swage.pixels, 8, 18, 48, 12),
  rect(42, 72, 24, 24, "study-focus", 'data-cursor="kernel"'),
  ...[0, 1, 2, 3].map((i) => path(`M115 ${54 + i * 28}h100`, "study-route")
    + multiply(225, 54 + i * 28)),
  bars("weights", staticPixel.weights, 164, 44, 28, 40),
  sumPair(312, 68, [[235, 54], [235, 82]], 280),
  sumPair(312, 124, [[235, 110], [235, 138]], 280),
  sumPair(383, 96, [[324, 68], [324, 124]], 350),
  arrow(395, 96, 74), rect(469, 23, 146, 146, "study-panel", 'data-box="scaled"'),
  grid("scaled", studies.swage.scaled.map((sample) => sample.value), 16, 470, 24, 9),
  rect(515, 69, 9, 9, "study-focus", 'data-cursor="pixel"'),
  path("M618 73.5h6", "study-warm", 'data-cursor="scan"'),
  path("M66 145v53h86", "study-route"),
  rect(152, 178, 40, 40), grid("neighbors", staticPixel.neighbors, 2, 154, 180, 18),
  arrow(192, 198, 33),
  path("M225 174h198M225 216h198", "study-grid"),
  bars("contributions", staticPixel.neighbors.map((value, i) => value * staticPixel.weights[i]), 232, 216, 47, 42, true),
], "swage");

const symbolStrip = (name, values, x, y, step = 18) => `<g data-symbols="${name}" data-x="${x}" data-y="${y}" data-step="${step}">`
  + values.map((value, i) => `<g data-symbol="${i}">${rect(x + i * step, y, step - 2, 15, "study-outline")}`
    + bits(value, 8).map((bit, k) => bit ? rect(x + i * step + 2 + k % 4 * 3, y + 3 + Math.floor(k / 4) * 5,
      2, 3, "study-dot") : "").join("") + "</g>").join("") + "</g>";
scenes.bellows = frame([
  symbolStrip("message", studies.bellows.message, 20, 25, 16),
  rect(19, 22, 64, 21, "study-focus", 'data-cursor="literal"'),
  symbolStrip("history", studies.bellows.message, 20, 97, 16),
  rect(19, 94, 64, 21, "study-focus", 'data-cursor="match"'),
  path("M91 40V69H27V97m-4-5 4 5 4-5", "study-warm", 'data-reference="match"'),
  path("M20 135h592", "study-guide"),
  rect(19, 150, 98, 32, "study-panel", 'data-box="token"'),
  grid("token", bits(0x48, 8), 8, 20, 160, 12), path("M68 150v32", "study-warm"),
  arrow(117, 166, 46), rect(163, 154, 130, 24, "study-panel", 'data-box="offset"'),
  grid("offset", bits(4, 16), 16, 164, 162, 8),
  arrow(293, 166, 33),
  symbolStrip("encoded", studies.bellows.encoded, 326, 158.5, 16),
  symbolStrip("decoded", studies.bellows.message, 20, 207, 16),
  path("M596 166h15V192H27v15m-4-5 4 5 4-5", "study-feedback"),
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
  ...[0, 1, 2].map((i) => path(`M280 ${48 + i * 58}h102M323 ${32 + i * 58}v32`, "study-grid")
    + rect(379, 42 + i * 58, 12, 12, "study-dot", `data-edge="${i}"`)),
  bars("edges", [40, 30, 42], 323, 44, 58, .45),
  path("M391 48h13v42h11M391 106h24M391 164h13v-42h11", "study-route"),
  path("M415 80h19a26 26 0 0 1 0 52h-19z", "study-panel"),
  arrow(460, 106, 26), rect(486, 91, 27, 30), path("m486 108 4 4-4 4"),
  arrow(513, 106, 26), rect(539, 40, 77, 132),
  grid("fragments", Array.from({length: 32}, (_, i) => i / 32), 4, 545, 42, 16),
  path("M20 220h220", "study-grid"),
  path("M240 220v-16h360v-32", "study-route"),
  path("m596 177 4-5 4 5", "study-route"),
  ...Array.from({length: 8}, (_, i) => rect(327 + i * 32, 193, 24, 22, "study-panel")),
  bars("depth", [.2, .8, .4, .65], 20, 220, 57, 25, true),
], "crucible");

scenes.furnace = frame([
  ...[0, 1, 2, 3].map((lane) =>
    rect(24, 46 + lane * 32, 104, 28)
    + grid(`queue-${lane}`, [1, .6, .2, 0], 4, 28, 48 + lane * 32, 24)
    + path(`M128 ${60 + lane * 32}h164`, "study-route")
    + rect(145, 56 + lane * 32, 8, 8, "study-dot", `data-request="${lane}"`)
    + path(`M${164 + lane * 12} ${60 + lane * 32}V${185 + lane * 10}H208`, "study-grid")),
  path("M292 44l48 32v64l-48 32z", "study-panel"),
  ...[0, 1, 2, 3].map((i) => path(`M292 ${60 + i * 32}L340 108`, "study-grid")),
  path("M128 60H292L340 108H392", "study-active-route", 'data-route="grant"'),
  rect(208, 178, 42, 42), grid("priority", Array.from({length: 16}, (_, i) => i % 5 ? .08 : .7), 4, 209, 179, 10),
  path("M250 199h8v-25h58v-18", "study-warm", 'data-control="priority"'),
  arrow(340, 108, 52), rect(392, 88, 40, 40, "study-panel", 'data-box="held"'),
  grid("held", bits(0, 16), 4, 396, 92, 8),
  arrow(432, 108, 56), rect(488, 47, 122, 122, "study-panel", 'data-box="memory"'),
  grid("memory", Array.from({length: 64}, (_, i) => i < 24 ? (i % 4 + 1) / 4 : 0), 8, 489, 48, 15),
  path("M549 169v37h-73v-66h-64v-12", "study-feedback"),
  rect(501, 200, 12, 12, "study-dot", 'data-ready=""'),
  path("M270 196h192M270 222h192", "study-grid"),
  path(stepWave(studies.furnace.frames.slice(0, 16).map((state) => state.grant !== undefined), 270, 196, 12),
    "study-line", 'data-timing="valid" data-x="270" data-y="196" data-step="12"'),
  path(stepWave(studies.furnace.frames.slice(0, 16).map((state) => state.ready), 270, 222, 12),
    "study-warm", 'data-timing="ready" data-x="270" data-y="222" data-step="12"'),
  path("M270 180v46", "study-focus", 'data-cursor="bus-clock"'),
  rect(408, 104, 8, 8, "study-solid-warm", 'data-cursor="beat"'),
], "furnace", [0, 1, 2, 3].map((lane) =>
  path(`M128 ${60 + lane * 32}H292L340 108H392`, "study-route", `data-transfer="${lane}"`)).join(""));

scenes.sable = frame([
  ...[0, 1, 2, 3].map((lane) => {
    const y = 35 + lane * 53, order = studies.sable.streams[lane].slice(1).map((state) => state.incoming);
    return symbolStrip(`arrival-${lane}`, order, 20, y - 7.5, 20)
      + path(`M178 ${y}H236`, "study-route", `data-lane="${lane}"`)
      + path(`m231 ${y - 4} 5 4-5 4`, "study-route")
      + rect(236, y - 12, 168, 24)
      + grid(`window-${lane}`, studies.sable.streams[lane][4].slots, 8, 240, y - 10, 20)
      + arrow(404, y, 52)
      + symbolStrip(`release-${lane}`, [0, 1, 2, 3, 4, 5, 6, 7], 456, y - 7.5, 20)
      + `<g data-arrival="${lane}" transform="translate(197 ${y})" opacity="0">${rect(-9, -7.5, 18, 15)}`
      + grid(`packet-${lane}`, bits(order[4], 3), 3, -6, -2, 4) + "</g>"
      + rect(19 + 3 * 20, y - 9.5, 20, 19, "study-focus", `data-cursor="sable-source-${lane}"`)
      + path(`M${240 + studies.sable.streams[lane][4].base * 20} ${y + 19}l-4 6h8z`, "study-solid-warm", `data-ack="${lane}"`)
      + path(`M404 ${y + 12}v10H169V${y + 7.5}m-4 5 4-5 4 5`, "study-feedback")
      + grid(`ack-${lane}`, studies.sable.streams[lane][4].slots, 8, 456, y + 19, 6);
  }),
], "sable");

const pipeline = studies.hammer.frames, pipelinePreview = pipeline[4];
scenes.hammer = frame([
  ...pipelinePreview.stages.map((instruction, stage) => {
    const x = 20 + stage * 124;
    return rect(x, 30, 104, 82) + grid(`instruction-${stage}`, bits(instruction + 1, 4), 4, x + 32, 40, 10)
      + path(`M${x + 8} 56h88`, "study-grid")
      + rect(x + 6, 34, 4, 16, "study-solid-warm", `data-stage-valid="${stage}"`)
      + (stage < 4 ? arrow(x + 104, 84, 20) : "");
  }),
  rect(30, 70, 24, 28), path("M34 79h16m-16 8h10M54 84h17"),
  rect(71, 65, 40, 38), path("M77 73h28m-28 8h20m-20 8h28m-28 8h16", "study-grid"),
  rect(156, 65, 50, 38),
  ...[0, 1, 2, 3].map((i) => path(`M162 ${72 + i * 8}h38`, "study-grid")),
  path("M216 65l15 9v20l-15 9zM206 75h10m-10 18h10M231 84h17", "study-route"),
  path("m284 65 15 8v8l-15 8v14l48-13V78l-48-13z", "study-panel"),
  path("M290 78h8m-4-4v8M332 84h26", "study-route"),
  rect(404, 65, 80, 38), grid("memory-word", bits(9, 8), 8, 408, 76, 9),
  rect(530, 65, 72, 38),
  ...[0, 1, 2].map((i) => path(`M536 ${74 + i * 10}h59`, "study-grid")),
  path("M196 30V12H72v18m-4-5 4 5 4-5", "study-warm", 'data-load-stall=""'),
  path("M444 112v12H320v-12m-4 5 4-5 4 5", "study-warm", 'data-forward="3"'),
  path("M568 112v24H304v-24m-4 5 4-5 4 5", "study-warm", 'data-forward="4" opacity=".12"'),
  circle(444, 124, 3, "study-solid-warm", 'data-cursor="forward-value"'),
  path("M12 144h616M220 151v78M454 151v78", "study-guide"),
  grid("schedule", Array.from({length: 5}, (_, instruction) =>
    pipeline.map((state) => state.stages.indexOf(instruction) + 1)).flat(), pipeline.length, 20, 151, 15, 5),
  rect(80, 151, 15, 75, "study-focus", 'data-cursor="pipeline-clock"'),
  rect(256, 154, 176, 26), grid("execute", bits(pipelinePreview.executeValue, 16), 16, 264, 159, 10),
  rect(256, 195, 176, 26), grid("writeback", bits(pipelinePreview.writebackValue, 16), 16, 264, 200, 10),
  path("M244 166h12m-12 42h12M432 208h10v-42h-10", "study-route"),
  grid("registers", pipelinePreview.registers.slice(1).flatMap((value) => bits(value, 8)), 8, 480, 151, 12),
  `<g data-symbols="retired">${Array.from({length: 5}, (_, i) =>
    path(`m597 ${157 + i * 12} 4 4 8-8`, "study-warm", `opacity="${i ? .1 : 1}"`)).join("")}</g>`,
], "hammer");

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
  console.log("Ten engineering-study SVGs match their generator.");
} else {
  await writeFile(file, updated);
  console.log("Generated ten detailed project studies; reference course diagrams are unchanged.");
}
