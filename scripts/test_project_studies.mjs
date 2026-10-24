import assert from "node:assert/strict";
import {test} from "node:test";
import {readFile} from "node:fs/promises";
import {studies, aesRound, aesSubstitute, hexBytes, sha256Block, fir, bilinear,
  lz4Sequences, encodeLz4, decodeLz4, triangleSample, roundRobinStudy, reorderStudy,
  halfToQ16, multiplyQ16} from "../project-study-models.js";

const hex = (values, width = 2) => values.map((value) => value.toString(16).padStart(width, "0")).join("");

test("AES uses the FIPS-197 first-round intermediate states, including column-major ShiftRows", () => {
  assert.equal(aesSubstitute(0), 0x63);
  const states = aesRound(hexBytes("00102030405060708090a0b0c0d0e0f0"),
    hexBytes("d6aa74fdd2af72fadaa678f1d6ab76fe"));
  assert.equal(hex(states[1]), "63cab7040953d051cd60e0e7ba70e18c");
  assert.equal(hex(states[2]), "6353e08c0960e104cd70b751bacad0e7");
  assert.equal(hex(states[3]), "5f72641557f5bc92f7be3b291db9f91a");
  assert.equal(hex(states[4]), "89d810e8855ace682d1843d8cb128fe4");
});

test("SHA-256 schedule, 64 compression rounds and feed-forward produce the abc digest", () => {
  assert.equal(studies.rivet.sha.words.length, 64);
  assert.equal(studies.rivet.sha.rounds.length, 65);
  assert.equal(hex(studies.rivet.sha.digest, 8), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  assert.throws(() => sha256Block([]), /64-byte/);
});

test("matrix products and binary16-to-Q16.16 conversion carry actual values", () => {
  const {matrix, vectors, outputs, fixed} = studies.anvil;
  vectors.forEach((vector, index) => matrix.forEach((row, y) =>
    assert.equal(outputs[index][y], row.reduce((sum, weight, x) => sum + weight * vector[x], 0))));
  assert.deepEqual(fixed, [98304, -49152, 131072, 32768]);
  assert.equal(halfToQ16(1), 0);
  assert.equal(halfToQ16(0x8000), 0);
  assert.throws(() => halfToQ16(0x7c00), /non-finite/);
  assert.throws(() => halfToQ16(0x7bff), /exceeds/);
  assert.equal(multiplyQ16(98304, -49152), -73728);
});

test("FIR impulse/DC response and the IIR recurrence agree with the drawn datapaths", () => {
  assert.deepEqual(fir([1, 0, 0, 0, 0, 0, 0, 0], [.25, .5, .25]), [.25, .5, .25, 0, 0, 0, 0, 0]);
  assert(fir(Array(32).fill(1), studies.billet.coefficients).every((value) => Math.abs(value - 1) < 1e-12));
  studies.billet.recursive.forEach((value, i, values) =>
    assert(Math.abs(value - .25 * studies.billet.signal[i] - .75 * values[(i + 127) % 128]) < 1e-12));
});

test("bilinear weights partition unity and reproduce planes, including clamped edges", () => {
  const plane = [0, 1, 2, 3];
  assert.equal(bilinear(plane, 2, .25, .75).value, 1.75);
  assert.equal(bilinear(plane, 2, -1, 8).value, 2);
  studies.swage.scaled.forEach(({value, weights, neighbors}) => {
    assert(Math.abs(weights.reduce((sum, weight) => sum + weight, 0) - 1) < 1e-12);
    assert(value >= Math.min(...neighbors) - 1e-12 && value <= Math.max(...neighbors) + 1e-12);
  });
});

test("LZ4 tokens round-trip, including overlapping matches and extended literal lengths", () => {
  for (const input of [studies.bellows.message, Array(300).fill(65),
    Array.from({length: 310}, (_, i) => i % 251), []]) {
    const sequences = lz4Sequences(input);
    const encoded = encodeLz4(sequences);
    assert.deepEqual(decodeLz4(encoded), input);
    if (sequences.some((sequence) => sequence.length)) {
      assert(sequences.at(-1).literals.length >= 5);
      assert(sequences.filter((sequence) => sequence.length).every((sequence) => sequence.start <= input.length - 12));
    }
  }
  assert(studies.bellows.sequences.some((sequence) => sequence.length > sequence.offset));
  assert(studies.bellows.encoded.length * 16 <= 294, "Encoded strip must fit its drawing.");
  assert.throws(() => decodeLz4([0, 0, 0]), /offset/);
  assert.throws(() => decodeLz4([0xf0]), /Truncated/);
});

test("raster coverage evaluates pixel centers and interpolates barycentric depth", () => {
  const vertices = studies.crucible.vertices;
  const center = vertices.reduce((point, vertex) => [point[0] + vertex[0] / 3, point[1] + vertex[1] / 3], [0, 0]);
  const sample = triangleSample(vertices, ...center);
  assert(sample.inside);
  assert(sample.weights.every((weight) => Math.abs(weight - 1 / 3) < 1e-12));
  assert(Math.abs(sample.depth - 1.4 / 3) < 1e-12);
  assert.equal(triangleSample(vertices, 0, 0).inside, false);
  assert.throws(() => triangleSample([[0, 0], [1, 1], [2, 2]], 0, 0), /non-degenerate/);
});

test("round-robin advances only on transfers and holds payload/grant during backpressure", () => {
  const frames = roundRobinStudy();
  assert.deepEqual(frames.slice(0, 4).map((frame) => frame.grant), [0, 1, 2, 3]);
  frames.slice(0, -1).forEach((frame, i) => {
    const next = frames[i + 1];
    assert(frame.queues.every((queue) => queue.length <= 4));
    assert.equal(next.memory.length - frame.memory.length, frame.ready && frame.grant !== undefined ? 1 : 0);
    if (!frame.ready) {
      assert.equal(next.grant, frame.grant);
      assert.equal(next.value, frame.value);
      assert.equal(next.priority, frame.priority);
    }
  });
});

test("four receiver windows release only contiguous prefixes and ACK holes accurately", () => {
  for (const frames of studies.sable.streams) {
    frames.forEach((frame) => {
      assert.deepEqual(frame.delivered, Array.from({length: frame.base}, (_, i) => i));
      assert(frame.slots.slice(0, frame.base).every((slot) => slot === 0));
    });
    assert.deepEqual(frames.at(-1).delivered, [0, 1, 2, 3, 4, 5, 6, 7]);
  }
  assert.deepEqual(reorderStudy([2, 0, 1]).at(-1).released, [1, 2]);
  assert.throws(() => reorderStudy([1, 1]), /distinct/);
});

test("nine wide scenes use the tested models and share a bounded, visible-only renderer", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  for (const project of Object.keys(studies)) assert(html.includes(`data-study="${project}" viewBox="0 0 640 240"`));
  const runtime = await readFile(new URL("../project-studies.js", import.meta.url), "utf8");
  for (const boundary of ["document.hidden", 'dataset.effects === "on"', "reduced.matches", "printing.matches", "scene.visible", "cancelAnimationFrame"])
    assert(runtime.includes(boundary));
});
