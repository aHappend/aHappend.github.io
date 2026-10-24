import {studies, clamp, gridPaths, triangleSample, encodeLz4} from "./project-study-models.js?v=20261025-engineering";

const contexts = new WeakMap();
const bits = (value, count) => Array.from({length: count}, (_, i) => (value >>> (count - i - 1)) & 1);
const bytes = (value) => [24, 16, 8, 0].map((shift) => (value >>> shift) & 255);
function attributes(node, values) {
  for (const [name, value] of Object.entries(values)) {
    const text = String(typeof value === "number" ? Math.round(value * 1000) / 1000 : value);
    if (node.getAttribute(name) !== text) node.setAttribute(name, text);
  }
}

function context(svg) {
  if (contexts.has(svg)) return contexts.get(svg);
  const nodes = new Map();
  const find = (selector) => {
    if (!nodes.has(selector)) {
      const node = svg.querySelector(selector);
      if (!node) throw new Error(`Missing ${svg.dataset.study} scene element: ${selector}`);
      nodes.set(selector, node);
    }
    return nodes.get(selector);
  };
  const ctx = {
    svg, model: studies[svg.dataset.study], find,
    cursor(name, values) { attributes(find(`[data-cursor="${name}"]`), values); },
    grid(name, values) {
      const group = find(`[data-grid="${name}"]`), data = group.dataset;
      gridPaths(values, +data.columns, +data.x, +data.y, +data.size, +data.scale)
        .forEach((d, i) => attributes(group.children[i], {d}));
    },
    bars(name, values) {
      const group = find(`[data-bars="${name}"]`), data = group.dataset;
      values.forEach((value, i) => {
        const length = Math.abs(value) * +data.gain, vertical = data.vertical === "true";
        attributes(group.children[i], {
          x: +data.x + (vertical ? i * +data.spacing : Math.min(value, 0) * +data.gain),
          y: +data.y + (vertical ? -Math.max(value, 0) * +data.gain : i * +data.spacing),
          width: vertical ? 8 : length, height: vertical ? length : 8,
          class: value < 0 ? "study-solid-warm" : "study-dot",
        });
      });
    },
    symbols(name, count) {
      [...find(`[data-symbols="${name}"]`).children].forEach((node, i) => attributes(node, {opacity: i < count ? 1 : .1}));
    },
  };
  contexts.set(svg, ctx);
  return ctx;
}

const renderers = {
  vulcan(c, t) {
    const sample = Math.min(15, Math.floor(t * 16));
    c.cursor("source", {y: 68 + Math.floor(t * 7) * 13});
    c.cursor("timing", {transform: `translate(${361 + t * 112 - 400} 0)`});
    c.cursor("fabric", {x: 542 + sample % 4 * 10, y: 80 + Math.floor(sample / 4) * 10});
    attributes(c.find('[data-register="rtl"]'), {opacity: c.model.valid[Math.max(0, sample - 1)] ? .95 : .15});
    for (let i = 0; i < 4; i++) attributes(c.find(`[data-check="${i}"]`), {opacity: t * 4 >= i ? 1 : .12});
  },
  anvil(c, t) {
    const vector = c.model.vectors[Math.floor(t * 4)], row = Math.floor(t * 16) % 4;
    c.bars("input", vector);
    c.bars("products", c.model.matrix[row].map((value, i) => value * vector[i]));
    const vectorIndex = Math.floor(t * 4);
    c.bars("output", c.model.outputs[vectorIndex].map((value, i) =>
      i <= row ? value : vectorIndex ? c.model.outputs[vectorIndex - 1][i] : 0));
    c.cursor("matrix", {y: 24 + row * 17});
    const word = Math.floor(t * 4), pair = Math.floor(word / 2) * 2;
    c.cursor("storage-word", {transform: `translate(${word % 2 * 96} 0)`});
    c.grid("packed", c.model.halfwords.slice(pair, pair + 2).flatMap((value) => bits(value, 16)));
    c.grid("extended", bits(c.model.fixed[word], 32));
    c.grid("accumulator", bits(c.model.fixedProducts.slice(0, word + 1).reduce((sum, value) => sum + value, 0), 32));
    c.bars("quantized", c.model.fixedProducts.map((value, i) => i <= word ? value / 65536 : 0));
  },
  rivet(c, t) {
    const stage = Math.min(3, Math.floor(t * 4)), progress = t * 4 - stage;
    c.cursor("aes", {x: 13 + Math.min(4, Math.floor(t * 5)) * 127});
    for (let i = 0; i < 16; i++) {
      const row = i % 4, column = Math.floor(i / 4);
      const target = stage === 1 ? (column - row + 4) % 4 : column;
      const x0 = 20 + stage * 127 + column * 17, x1 = 20 + (stage + 1) * 127 + target * 17;
      const y = stage === 2 ? 24 + row * 17 + (49.5 - (24 + row * 17)) * Math.sin(progress * Math.PI) : 24 + row * 17;
      attributes(c.find(`[data-byte="${i}"]`), {x: x0 + (x1 - x0) * progress, y,
        opacity: progress < .08 || progress > .92 ? 0 : .9});
    }
    const round = Math.min(64, Math.floor(t * 70));
    c.model.sha.rounds[round].forEach((word, i) => c.grid(`sha-${i}`, bytes(word)));
    c.grid("digest", c.model.sha.digest.map((word) => round === 64 ? word >>> 24 : 0));
    c.grid("schedule", c.model.sha.words.map((word, i) => i <= round ? word >>> 24 : 0));
  },
  billet(c, t) {
    const sample = (Math.floor(t * 128) + 112) % 128;
    for (const name of ["input", "fir", "iir"])
      attributes(c.find(`[data-wave="${name}"]`), {transform: `translate(${-t * 128} 0)`});
    const taps = c.model.coefficients.map((_, i) => c.model.signal[(sample - i + 128) % 128]);
    c.bars("taps", taps);
    c.bars("products", taps.map((value, i) => value * c.model.coefficients[i]));
  },
  swage(c, t) {
    const index = Math.min(255, Math.floor(t * 256)), sample = c.model.scaled[index];
    c.cursor("kernel", {x: 18 + sample.x0 * 12, y: 30 + sample.y0 * 12,
      width: sample.x0 === 7 ? 12 : 24, height: sample.y0 === 7 ? 12 : 24});
    c.cursor("pixel", {x: 470 + index % 16 * 9, y: 34 + Math.floor(index / 16) * 9});
    c.cursor("scan", {transform: `translate(0 ${34 + Math.floor(index / 16) * 9 - 97})`});
    c.bars("weights", sample.weights);
    c.grid("neighbors", sample.neighbors);
    c.bars("contributions", sample.neighbors.map((value, i) => value * sample.weights[i]));
    c.grid("scaled", c.model.scaled.map((pixel, i) => i <= index ? pixel.value : 0));
  },
  bellows(c, t) {
    const position = t * c.model.sequences.length, index = Math.floor(position);
    const sequence = c.model.sequences[index], progress = position - index;
    const start = sequence.start - sequence.literals.length;
    c.cursor("literal", {x: 19 + start * 16, width: Math.max(1, sequence.literals.length * 16),
      opacity: sequence.literals.length ? 1 : 0});
    c.cursor("match", {x: 19 + sequence.from * 16, width: Math.min(sequence.offset, sequence.length) * 16 + 2,
      opacity: sequence.length ? 1 : 0});
    attributes(c.find('[data-reference="match"]'), {opacity: sequence.length ? 1 : 0,
      d: `M${27 + sequence.from * 16} 92V69H${27 + sequence.start * 16}V44`});
    c.grid("token", bits((Math.min(sequence.literals.length, 15) << 4) | (sequence.length ? Math.min(sequence.length - 4, 15) : 0), 8));
    c.grid("offset", bits(sequence.offset, 16));
    c.symbols("history", sequence.start);
    c.symbols("encoded", encodeLz4(c.model.sequences.slice(0, index + 1)).length);
    c.symbols("decoded", sequence.length ? sequence.start + Math.floor(sequence.length * progress) : c.model.message.length);
  },
  crucible(c, t) {
    const index = Math.min(191, Math.floor(t * 192));
    const x = index % 16, y = Math.floor(index / 16);
    c.cursor("fragment", {x: 18 + x * 14, y: 22 + y * 14});
    c.cursor("sample", {d: `M${25 + x * 14} ${24 + y * 14}v10m-5-5h10`});
    const sample = triangleSample(c.model.vertices, x + .5, y + .5);
    c.bars("edges", sample.weights.map((weight) => clamp(weight, -1, 1) * 85));
    sample.weights.forEach((weight, i) => attributes(c.find(`[data-edge="${i}"]`),
      {class: weight >= 0 ? "study-dot" : "study-solid-warm", opacity: weight >= 0 ? 1 : .5}));
    const covered = [], fragments = [];
    for (let i = 0; i <= index; i++) {
      const pixel = triangleSample(c.model.vertices, i % 16 + .5, Math.floor(i / 16) + .5);
      if (pixel.inside) covered.push(`M${19 + i % 16 * 14} ${23 + Math.floor(i / 16) * 14}h12v12h-12z`);
      if (pixel.inside && pixel.depth < .65) fragments.push(pixel.depth);
    }
    attributes(c.find("[data-coverage]"), {d: covered.join("")});
    const buffer = fragments.slice(-32);
    c.grid("fragments", Array.from({length: 32}, (_, i) => buffer[i] ?? 0));
    c.bars("depth", [...sample.weights.map((value) => clamp(value, 0, 1)), clamp(sample.depth, 0, 1)]);
  },
  furnace(c, t) {
    const tick = t * c.model.frames.length, state = c.model.frames[Math.floor(tick)];
    state.queues.forEach((queue, lane) => {
      c.grid(`queue-${lane}`, Array.from({length: 4}, (_, i) => i < queue.length ? .35 + (queue[i] & 3) * .2 : 0));
      attributes(c.find(`[data-request="${lane}"]`), {opacity: queue.length ? 1 : .1});
    });
    c.grid("priority", Array.from({length: 16}, (_, i) =>
      i % 4 === (Math.floor(i / 4) + state.priority) % 4 ? 1 : 0));
    attributes(c.find('[data-route="grant"]'), {d: state.grant === undefined ? "" :
      `M108 ${44 + state.grant * 44}h246L386 108h44`, opacity: state.ready ? 1 : .4});
    c.grid("held", bits(state.value ?? 0, 16));
    c.grid("memory", Array.from({length: 64}, (_, i) => state.memory[i] ? (state.memory[i].lane + 1) / 4 : 0));
    attributes(c.find("[data-ready]"), {class: state.ready ? "study-dot" : "study-solid-warm"});
    c.cursor("bus-clock", {transform: `translate(${(tick % 16) * 12} 0)`});
    const progress = tick % 1;
    const x = state.ready ? 108 + progress * 322 : 435;
    const y = state.ready && x < 354 ? 44 + state.grant * 44
      : state.ready && x < 386 ? (44 + state.grant * 44) + (108 - (44 + state.grant * 44)) * (x - 354) / 32 : 108;
    c.cursor("beat", {x: x - 4, y: y - 4, opacity: state.grant === undefined ? 0 : 1});
  },
  sable(c, t) {
    c.model.streams.forEach((frames, lane) => {
      const time = clamp(t * 10 - lane * .45, 0, 8), step = Math.min(7, Math.floor(time)), fraction = time - step;
      const state = frames[Math.min(8, step + (fraction >= .65 ? 1 : 0))];
      const y = 35 + lane * 53;
      c.grid(`window-${lane}`, state.slots);
      c.grid(`ack-${lane}`, state.slots);
      c.grid(`packet-${lane}`, bits(frames[step + 1].incoming, 3));
      attributes(c.find(`[data-arrival="${lane}"]`), {transform: `translate(${180 + 52 * Math.min(1, fraction / .65)} ${y + 4})`,
        opacity: t * 10 >= lane * .45 && fraction < .65 && time < 8 ? 1 : 0});
      attributes(c.find(`[data-ack="${lane}"]`), {d: `M${233 + state.base * 22} ${y + 17}l-4 6h8z`});
      c.symbols(`release-${lane}`, state.delivered.length);
      c.cursor(`sable-source-${lane}`, {x: 19 + step * 18});
    });
  },
};

export function renderStudy(svg, phase) {
  if (!Number.isFinite(phase) || phase < 0 || phase >= 1) throw new RangeError("Study phase must be in [0, 1).");
  const c = context(svg);
  renderers[svg.dataset.study](c, phase);
  attributes(svg, {"data-study-frame": Math.floor(phase * 10000)});
}

const scenes = [...document.querySelectorAll("svg[data-study]")].map((svg) => ({
  svg, visual: svg.closest(".project-spec"), visible: false, started: null,
}));
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
const printing = matchMedia("print");
let frame = null, lastPaint = 0;
const enabled = () => document.documentElement.dataset.effects === "on" && !reduced.matches && !printing.matches && !document.hidden;

function animate(now) {
  frame = null;
  if (!enabled() || !scenes.some((scene) => scene.visible)) return;
  if (now - lastPaint >= 1000 / 30) {
    for (const scene of scenes) {
      if (scene.visible) {
        // Start on the frame clock: an observer can run after its timestamp.
        scene.started ??= now;
        renderStudy(scene.svg, ((now - scene.started) / 1000 / studies[scene.svg.dataset.study].duration) % 1);
      }
    }
    lastPaint = now;
  }
  frame = requestAnimationFrame(animate);
}

function reconcile() {
  if (enabled() && scenes.some((scene) => scene.visible)) {
    if (frame === null) {
      for (const scene of scenes) if (scene.visible) scene.started = null;
      frame = requestAnimationFrame(animate);
    }
  } else if (frame !== null) {
    cancelAnimationFrame(frame);
    frame = null;
  }
}

for (const scene of scenes) {
  renderStudy(scene.svg, .62);
  scene.visible = scene.visual.classList.contains("is-visible");
  scene.visual.addEventListener("studyvisibility", () => {
    const visible = scene.visual.classList.contains("is-visible");
    if (visible && !scene.visible) scene.started = null;
    scene.visible = visible;
    reconcile();
  });
}
new MutationObserver(reconcile).observe(document.documentElement, {attributes: true, attributeFilter: ["data-effects"]});
document.addEventListener("visibilitychange", reconcile);
reduced.addEventListener("change", reconcile);
printing.addEventListener("change", reconcile);
reconcile();
