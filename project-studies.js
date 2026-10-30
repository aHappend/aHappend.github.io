import {studies, clamp, gridPaths, stepWave, triangleSample, encodeLz4, aesStageFrame} from "./project-study-models.js?v=20261031-hammer";

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
    const fabric = c.find('[data-grid="fabric"]').dataset;
    c.cursor("fabric", {x: +fabric.x + 1 + sample % 4 * +fabric.size,
      y: +fabric.y + 1 + Math.floor(sample / 4) * +fabric.size});
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
    const matrix = c.find('[data-grid="matrix"]').dataset;
    c.cursor("matrix", {y: +matrix.y + row * +matrix.size});
    const word = Math.floor(t * 4);
    c.cursor("storage-word", {x: 56 + word * 24});
    c.grid("packed", bits(c.model.halfwords[word], 16));
    c.grid("extended", bits(c.model.fixed[word], 32));
    c.grid("accumulator", bytes(c.model.fixedProducts.slice(0, word + 1).reduce((sum, value) => sum + value, 0)));
    c.bars("quantized", c.model.fixedProducts.map((value, i) => i <= word ? value / 65536 : 0));
  },
  rivet(c, t) {
    const {stage, progress, values, active} = aesStageFrame(c.model.aes, t);
    const destination = c.find(`[data-grid="aes-${stage + 1}"]`).dataset;
    c.cursor("aes", {x: +destination.x - 3});
    c.model.aes.forEach((state, i) => {
      const shown = i === stage + 1 ? values : state;
      c.grid(`aes-${i}`, Array.from({length: 16}, (_, cell) => shown[(cell % 4) * 4 + Math.floor(cell / 4)]));
    });
    for (let i = 0; i < 16; i++) {
      const row = i % 4, column = Math.floor(i / 4);
      attributes(c.find(`[data-byte="${i}"]`), {
        x: +destination.x + column * +destination.size + 1.5,
        y: +destination.y + row * +destination.size + 1.5,
        opacity: active[i] ? .9 : 0,
      });
    }
    const route = c.find(`[data-aes-link="${stage}"]`);
    const point = route.getPointAtLength(3 + progress * (route.getTotalLength() - 6));
    c.cursor("aes-transfer", {cx: point.x, cy: point.y});
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
    const source = c.find('[data-grid="source"]').dataset, output = c.find('[data-grid="scaled"]').dataset;
    c.cursor("kernel", {x: +source.x + sample.x0 * +source.size, y: +source.y + sample.y0 * +source.size,
      width: (sample.x0 === 7 ? 1 : 2) * +source.size, height: (sample.y0 === 7 ? 1 : 2) * +source.size});
    const rowY = +output.y + Math.floor(index / +output.columns) * +output.size;
    c.cursor("pixel", {x: +output.x + index % +output.columns * +output.size, y: rowY});
    c.cursor("scan", {d: `M${+output.x + +output.columns * +output.size + 4} ${rowY + +output.size / 2}h6`});
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
    c.cursor("match", {x: 19 + sequence.from * 16, width: Math.min(sequence.offset, sequence.length) * 16,
      opacity: sequence.length ? 1 : 0});
    const history = c.find('[data-symbols="history"]').dataset, message = c.find('[data-symbols="message"]').dataset;
    const from = +history.x + sequence.from * +history.step + (+history.step - 2) / 2;
    const to = +message.x + sequence.start * +message.step + (+message.step - 2) / 2;
    attributes(c.find('[data-reference="match"]'), {opacity: sequence.length ? 1 : 0,
      d: `M${to} ${+message.y + 15}V69H${from}V${history.y}m-4-5 4 5 4-5`});
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
    const route = state.grant === undefined ? null : c.find(`[data-transfer="${state.grant}"]`);
    attributes(c.find('[data-route="grant"]'), {d: route?.getAttribute("d") ?? "", opacity: state.ready ? 1 : .4});
    c.grid("held", bits(state.value ?? 0, 16));
    c.grid("memory", Array.from({length: 64}, (_, i) => state.memory[i] ? (state.memory[i].lane + 1) / 4 : 0));
    attributes(c.find("[data-ready]"), {class: state.ready ? "study-dot" : "study-solid-warm"});
    const timingStart = Math.floor(tick / 16) * 16, timing = c.model.frames.slice(timingStart, timingStart + 16);
    for (const name of ["valid", "ready"]) {
      const wave = c.find(`[data-timing="${name}"]`), {x, y, step} = wave.dataset;
      attributes(wave, {d: stepWave(timing.map((frame) => name === "ready" ? frame.ready : frame.grant !== undefined), +x, +y, +step)});
    }
    c.cursor("bus-clock", {transform: `translate(${(tick % 16) * +c.find('[data-timing="ready"]').dataset.step} 0)`});
    const held = c.find('[data-grid="held"]').dataset;
    const point = state.ready && route ? route.getPointAtLength((tick % 1) * route.getTotalLength())
      : {x: +held.x + 2 * +held.size, y: +held.y + 2 * +held.size};
    c.cursor("beat", {x: point.x - 4, y: point.y - 4, opacity: route ? 1 : 0});
  },
  hammer(c, t) {
    const tick = t * c.model.frames.length, state = c.model.frames[Math.floor(tick)];
    state.stages.forEach((instruction, stage) => {
      c.grid(`instruction-${stage}`, bits(instruction === null ? 0 : instruction + 1, 4));
      attributes(c.find(`[data-stage-valid="${stage}"]`), {opacity: instruction === null ? .08 : .9});
    });
    c.grid("registers", state.registers.slice(1).flatMap((value) => bits(value, 8)));
    c.grid("execute", bits(state.executeValue ?? 0, 16));
    c.grid("writeback", bits(state.writebackValue ?? 0, 16));
    c.symbols("retired", state.retired.length);
    c.cursor("pipeline-clock", {x: 20 + tick * 15});
    attributes(c.find("[data-load-stall]"), {opacity: state.stall ? 1 : .08});
    for (const stage of [3, 4])
      attributes(c.find(`[data-forward="${stage}"]`), {opacity: state.forwards.includes(stage) ? 1 : .12});
    const route = state.forwards.length ? c.find(`[data-forward="${state.forwards[0]}"]`) : null;
    const point = route ? route.getPointAtLength((tick % 1) * route.getTotalLength()) : {x: 320, y: 120};
    c.cursor("forward-value", {cx: point.x, cy: point.y, opacity: route ? 1 : 0});
  },
  sable(c, t) {
    c.model.streams.forEach((frames, lane) => {
      const time = clamp(t * 10 - lane * .45, 0, 8), step = Math.min(7, Math.floor(time)), fraction = time - step;
      const state = frames[Math.min(8, step + (fraction >= .65 ? 1 : 0))];
      const route = c.find(`[data-lane="${lane}"]`), routeLength = route.getTotalLength();
      const point = route.getPointAtLength(9 + (routeLength - 18) * Math.min(1, fraction / .65));
      const window = c.find(`[data-grid="window-${lane}"]`).dataset;
      c.grid(`window-${lane}`, state.slots);
      c.grid(`ack-${lane}`, state.slots);
      c.grid(`packet-${lane}`, bits(frames[step + 1].incoming, 3));
      attributes(c.find(`[data-arrival="${lane}"]`), {transform: `translate(${point.x} ${point.y})`,
        opacity: t * 10 >= lane * .45 && fraction < .65 && time < 8 ? 1 : 0});
      attributes(c.find(`[data-ack="${lane}"]`), {d: `M${+window.x + state.base * +window.size} ${point.y + 19}l-4 6h8z`});
      c.symbols(`release-${lane}`, state.delivered.length);
      const source = c.find(`[data-symbols="arrival-${lane}"]`).dataset;
      c.cursor(`sable-source-${lane}`, {x: +source.x - 1 + step * +source.step});
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
