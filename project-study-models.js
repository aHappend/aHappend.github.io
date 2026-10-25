// Fixed teaching examples, not RTL traces, board measurements, or acceptance results.
export const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
export const hexBytes = (hex) => hex.match(/../g).map((byte) => parseInt(byte, 16));
const byteRotate = (value, bits) => ((value << bits) | (value >>> (8 - bits))) & 255;

export function gfMultiply(a, b) {
  let result = 0;
  for (let bit = 0; bit < 8; bit++) {
    if (b & 1) result ^= a;
    a = ((a << 1) ^ (a & 128 ? 0x11b : 0)) & 255;
    b >>>= 1;
  }
  return result;
}

export function aesSubstitute(value) {
  let inverse = value ? 1 : 0;
  for (let i = 0; i < 254 && value; i++) inverse = gfMultiply(inverse, value);
  return inverse ^ byteRotate(inverse, 1) ^ byteRotate(inverse, 2)
    ^ byteRotate(inverse, 3) ^ byteRotate(inverse, 4) ^ 0x63;
}

export function aesRound(input, key) {
  const substitute = input.map(aesSubstitute);
  const shift = substitute.map((_, i) => substitute[((Math.floor(i / 4) + i % 4) % 4) * 4 + i % 4]);
  const coefficients = [2, 3, 1, 1];
  const mix = shift.map((_, i) => {
    const column = Math.floor(i / 4), row = i % 4;
    return coefficients.reduce((value, coefficient, j) =>
      value ^ gfMultiply(shift[column * 4 + (row + j) % 4], coefficient), 0);
  });
  return [input, substitute, shift, mix, mix.map((value, i) => value ^ key[i])];
}

export function aesStageFrame(states, phase) {
  if (!Number.isFinite(phase) || phase < 0 || phase >= 1) throw new RangeError("AES study phase must be in [0, 1).");
  const stage = Math.floor(phase * 4), progress = phase * 4 - stage;
  const groups = stage === 1 || stage === 2 ? 4 : 16;
  const current = Math.min(groups - 1, Math.floor(progress * groups));
  const group = (i) => stage === 1 ? i % 4 : stage === 2 ? Math.floor(i / 4) : i;
  return {
    stage, progress,
    values: states[stage + 1].map((value, i) => group(i) <= current ? value : states[stage][i]),
    active: states[stage].map((_, i) => group(i) === current),
  };
}

const rotate = (value, bits) => (value >>> bits) | (value << (32 - bits));
const primes = [];
for (let value = 2; primes.length < 64; value++) {
  if (primes.every((prime) => value % prime !== 0)) primes.push(value);
}
const fractionWord = (value) => Math.floor((value - Math.floor(value)) * 2 ** 32) >>> 0;
const shaInitial = primes.slice(0, 8).map((prime) => fractionWord(Math.sqrt(prime)));
const shaConstants = primes.map((prime) => fractionWord(Math.cbrt(prime)));

export function sha256Block(bytes) {
  if (bytes.length !== 64) throw new RangeError("The SHA study requires exactly one padded 64-byte block.");
  const words = Array.from({length: 16}, (_, i) =>
    ((bytes[i * 4] << 24) | (bytes[i * 4 + 1] << 16) | (bytes[i * 4 + 2] << 8) | bytes[i * 4 + 3]) >>> 0);
  for (let i = 16; i < 64; i++) {
    const x = words[i - 15], y = words[i - 2];
    words.push((words[i - 16] + (rotate(x, 7) ^ rotate(x, 18) ^ (x >>> 3))
      + words[i - 7] + (rotate(y, 17) ^ rotate(y, 19) ^ (y >>> 10))) >>> 0);
  }
  let state = [...shaInitial];
  const rounds = [state];
  words.forEach((word, i) => {
    const [a, b, c, d, e, f, g, h] = state;
    const t1 = (h + (rotate(e, 6) ^ rotate(e, 11) ^ rotate(e, 25))
      + ((e & f) ^ (~e & g)) + shaConstants[i] + word) >>> 0;
    const t2 = ((rotate(a, 2) ^ rotate(a, 13) ^ rotate(a, 22))
      + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
    state = [(t1 + t2) >>> 0, a, b, c, (d + t1) >>> 0, e, f, g];
    rounds.push(state);
  });
  return {words, rounds, digest: state.map((value, i) => (value + shaInitial[i]) >>> 0)};
}

export function fir(input, coefficients) {
  return input.map((_, i) => coefficients.reduce((sum, coefficient, tap) =>
    sum + coefficient * input[(i - tap + input.length) % input.length], 0));
}

export function halfToQ16(word) {
  const sign = word & 0x8000 ? -1 : 1, exponent = (word >>> 10) & 31, fraction = word & 1023;
  if (exponent === 31) throw new RangeError("The fixed-point study excludes non-finite binary16 values.");
  const value = Math.trunc(sign * (exponent ? 1024 + fraction : fraction) * 2 ** (exponent ? exponent - 9 : -8));
  if (value < -2147483648 || value > 2147483647) throw new RangeError("Binary16 value exceeds signed Q16.16.");
  return value === 0 ? 0 : value;
}

export const multiplyQ16 = (a, b) => Number((BigInt(a) * BigInt(b)) >> 16n);

export function bilinear(source, width, x, y) {
  x = clamp(x, 0, width - 1);
  y = clamp(y, 0, source.length / width - 1);
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const x1 = Math.min(x0 + 1, width - 1), y1 = Math.min(y0 + 1, source.length / width - 1);
  const dx = x - x0, dy = y - y0;
  const weights = [(1 - dx) * (1 - dy), dx * (1 - dy), (1 - dx) * dy, dx * dy];
  const neighbors = [source[y0 * width + x0], source[y0 * width + x1],
    source[y1 * width + x0], source[y1 * width + x1]];
  return {x0, y0, weights, neighbors, value: neighbors.reduce((sum, value, i) => sum + value * weights[i], 0)};
}

export function lz4Sequences(input) {
  const sequences = [];
  let position = 0, anchor = 0;
  while (position <= input.length - 12) {
    let length = 0, offset = 0;
    for (let candidate = 0; candidate < position; candidate++) {
      let matched = 0;
      while (position + matched < input.length - 5 && input[candidate + matched] === input[position + matched]) matched++;
      if (matched > length) { length = matched; offset = position - candidate; }
    }
    if (length < 4) { position++; continue; }
    sequences.push({start: position, from: position - offset, literals: input.slice(anchor, position), offset, length});
    position += length;
    anchor = position;
  }
  sequences.push({start: input.length, from: input.length, literals: input.slice(anchor), offset: 0, length: 0});
  return sequences;
}

export function encodeLz4(sequences) {
  const output = [];
  const extension = (value) => {
    while (value >= 255) { output.push(255); value -= 255; }
    output.push(value);
  };
  sequences.forEach(({literals, offset, length}) => {
    output.push((Math.min(literals.length, 15) << 4) | (length ? Math.min(length - 4, 15) : 0));
    if (literals.length >= 15) extension(literals.length - 15);
    output.push(...literals);
    if (!length) return;
    output.push(offset & 255, offset >>> 8);
    if (length >= 19) extension(length - 19);
  });
  return output;
}

export function decodeLz4(input) {
  const output = [];
  let cursor = 0;
  const extension = (length) => {
    if (length !== 15) return length;
    let next;
    do {
      if (cursor >= input.length) throw new RangeError("Truncated LZ4 length.");
      next = input[cursor++];
      length += next;
    } while (next === 255);
    return length;
  };
  while (cursor < input.length) {
    const token = input[cursor++];
    const literals = extension(token >>> 4);
    if (cursor + literals > input.length) throw new RangeError("Truncated LZ4 literals.");
    output.push(...input.slice(cursor, cursor + literals));
    cursor += literals;
    if (cursor === input.length) break;
    if (cursor + 2 > input.length) throw new RangeError("Truncated LZ4 offset.");
    const offset = input[cursor++] | (input[cursor++] << 8);
    if (!offset || offset > output.length) throw new RangeError("Invalid LZ4 offset.");
    const length = extension(token & 15) + 4;
    for (let i = 0; i < length; i++) output.push(output[output.length - offset]);
  }
  return output;
}

export function triangleSample(vertices, x, y) {
  const edge = (a, b) => (b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]);
  const edges = vertices.map((a, i) => edge(a, vertices[(i + 1) % 3]));
  const area = (vertices[1][0] - vertices[0][0]) * (vertices[2][1] - vertices[0][1])
    - (vertices[1][1] - vertices[0][1]) * (vertices[2][0] - vertices[0][0]);
  if (!area) throw new RangeError("The raster study requires a non-degenerate triangle.");
  const weights = [edges[1] / area, edges[2] / area, edges[0] / area];
  return {edges, weights, inside: weights.every((value) => value >= 0),
    depth: weights.reduce((sum, value, i) => sum + value * [.2, .8, .4][i], 0)};
}

export function roundRobinStudy(cycles = 40) {
  const queues = [[0, 1], [16, 17], [32, 33], [48, 49]];
  const nextValues = [2, 18, 34, 50], memory = [], frames = [];
  let priority = 0, held = null;
  for (let cycle = 0; cycle < cycles; cycle++) {
    queues.forEach((queue, lane) => {
      if (cycle % 4 === lane && queue.length < 4) queue.push(nextValues[lane]++);
    });
    const grant = held ?? Array.from({length: 4}, (_, i) => (priority + i) % 4).find((lane) => queues[lane].length);
    const ready = ![5, 6, 13, 14, 15, 24, 25, 35].includes(cycle);
    const value = grant === undefined ? null : queues[grant][0];
    frames.push({cycle, queues: queues.map((queue) => [...queue]), grant, ready, value, memory: [...memory], priority});
    if (grant !== undefined && ready) {
      memory.push({lane: grant, value: queues[grant].shift()});
      priority = (grant + 1) % 4;
      held = null;
    } else {
      held = grant ?? null;
    }
  }
  return frames;
}

export function reorderStudy(order) {
  const received = new Set(), delivered = [], frames = [];
  let base = 0;
  frames.push({base, slots: Array(8).fill(0), delivered: [], released: [], incoming: null});
  order.forEach((sequence) => {
    if (!Number.isInteger(sequence) || sequence < 0 || sequence >= 8 || received.has(sequence) || sequence < base)
      throw new RangeError("The reorder study needs distinct sequence numbers in its eight-slot window.");
    received.add(sequence);
    const released = [];
    while (received.has(base)) {
      received.delete(base);
      released.push(base);
      delivered.push(base++);
    }
    frames.push({base, slots: Array.from({length: 8}, (_, i) => received.has(i) ? 1 : 0),
      delivered: [...delivered], released, incoming: sequence});
  });
  return frames;
}

const signal = Array.from({length: 128}, (_, i) =>
  .62 * Math.sin(i * Math.PI / 16) + .25 * Math.sin(i * Math.PI * 7 / 16));
const coefficients = [1, 2, 3, 2, 1].map((value) => value / 9);
let previous = 0;
const recursive = [];
for (let i = 0; i < signal.length * 12; i++) {
  previous = .25 * signal[i % signal.length] + .75 * previous;
  if (i >= signal.length * 11) recursive.push(previous);
}
const pixels = Array.from({length: 64}, (_, i) => {
  const x = i % 8, y = Math.floor(i / 8);
  return clamp(.12 + .75 * Math.exp(-((x - 2) ** 2 + (y - 2) ** 2) / 4)
    + .55 * Math.exp(-((x - 5) ** 2 + (y - 5) ** 2) / 3), 0, 1);
});
const scaled = Array.from({length: 256}, (_, i) => bilinear(pixels, 8, (i % 16 + .5) / 2 - .5,
  (Math.floor(i / 16) + .5) / 2 - .5));
const message = [...new TextEncoder().encode("ABCDABCDABCDABCD|ABCDABCDABCD|END!!")];
const sequences = lz4Sequences(message);
const padded = Array(64).fill(0);
padded.splice(0, 4, 97, 98, 99, 128);
padded[63] = 24;
const matrix = [[2, -1, 0, 3], [1, 2, -2, 0], [-1, 1, 3, 2], [0, -2, 1, 1]];
const vectors = [[1, 2, -1, 1], [2, 0, 1, -1], [-1, 1, 2, 0], [0, -1, 1, 2]];
const halfwords = [0x3e00, 0xba00, 0x4000, 0x3800];
const fixed = halfwords.map(halfToQ16);

export const studies = {
  vulcan: {duration: 12, clock: [0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1],
    valid: [0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 0, 0, 1, 1, 0]},
  anvil: {duration: 12, matrix, vectors,
    outputs: vectors.map((vector) => matrix.map((row) => row.reduce((sum, value, i) => sum + value * vector[i], 0))),
    halfwords, fixed, fixedProducts: fixed.map((value) => multiplyQ16(value, 98304))},
  rivet: {duration: 14, aes: aesRound(hexBytes("00102030405060708090a0b0c0d0e0f0"),
    hexBytes("d6aa74fdd2af72fadaa678f1d6ab76fe")), sha: sha256Block(padded)},
  billet: {duration: 12, signal, coefficients, filtered: fir(signal, coefficients), recursive},
  swage: {duration: 14, pixels, scaled},
  bellows: {duration: 14, message, sequences, encoded: encodeLz4(sequences)},
  crucible: {duration: 14, vertices: [[2, 1], [14, 3], [6, 11]]},
  furnace: {duration: 14, frames: roundRobinStudy()},
  sable: {duration: 14, streams: [[2, 0, 3, 1, 5, 7, 4, 6], [1, 3, 0, 2, 6, 4, 7, 5],
    [3, 1, 0, 2, 7, 5, 4, 6], [0, 2, 4, 1, 6, 3, 7, 5]].map(reorderStudy)},
};

export function gridPaths(values, columns, x, y, size, scale = 1) {
  const paths = Array(8).fill("");
  values.forEach((value, i) => {
    const level = clamp(Math.floor(value / scale * 7), 0, 7);
    const left = x + i % columns * size, top = y + Math.floor(i / columns) * size;
    paths[level] += `M${left + 1} ${top + 1}h${size - 2}v${size - 2}h${2 - size}z`;
  });
  return paths;
}

export function wavePath(values, x, y, width, amplitude) {
  return values.map((value, i) => `${i ? "L" : "M"}${(x + i / (values.length - 1) * width).toFixed(2)} ${(y - value * amplitude).toFixed(2)}`).join("");
}

export const stepWave = (values, x, y, spacing = 7) => values.map((value, i) =>
  `${i ? "H" : "M"}${x + i * spacing}${i ? "V" : " "}${y - value * 12}h${spacing}`).join("");
