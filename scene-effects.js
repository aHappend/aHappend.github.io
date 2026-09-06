const sceneEffects = (() => {
  const TAU = Math.PI * 2;
  const SCENES = new Set(["botanical", "mountain", "meadow", "pond", "fern", "rose", "coast"]);

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (edge0, edge1, value) => {
    const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  };
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2);
  const easeOut = (t) => 1 - (1 - t) ** 3;
  const quadPoint = (x0, y0, x1, y1, x2, y2, t) => {
    const u = 1 - t;
    return {
      x: u * u * x0 + 2 * u * t * x1 + t * t * x2,
      y: u * u * y0 + 2 * u * t * y1 + t * t * y2,
    };
  };

  function isFiniteNumber(value) {
    return typeof value === "number" && Number.isFinite(value);
  }

  function fail(api, message) {
    throw new TypeError(`sceneEffects.${api}: ${message}`);
  }

  function validateScene(scene, api) {
    if (!SCENES.has(scene)) {
      fail(api, `scene must be one of ${[...SCENES].join(", ")}`);
    }
  }

  function validateBounds(bounds, api) {
    if (!bounds || typeof bounds !== "object") fail(api, "bounds must be an object");
    const { x, y, width, height } = bounds;
    if (![x, y, width, height].every(isFiniteNumber)) {
      fail(api, "bounds must include finite x, y, width, and height values");
    }
    if (width <= 0 || height <= 0) {
      fail(api, "bounds width and height must be greater than zero");
    }
  }

  function validatePoint(point, api) {
    if (!point || typeof point !== "object") fail(api, "point must be an object");
    const { x, y } = point;
    if (![x, y].every(isFiniteNumber)) fail(api, "point must include finite x and y values");
  }

  function validateNow(now, api) {
    if (!isFiniteNumber(now)) fail(api, "now must be a finite number");
  }

  function mk(scene, kind, born, life, props) {
    return { scene, kind, born, life, ...props };
  }

  function boundsPoint(bounds, nx, ny) {
    return { x: bounds.x + bounds.width * nx, y: bounds.y + bounds.height * ny };
  }

  function clampPointToRegion(point, bounds, minX, maxX, minY, maxY) {
    return {
      x: clamp(point.x, bounds.x + bounds.width * minX, bounds.x + bounds.width * maxX),
      y: clamp(point.y, bounds.y + bounds.height * minY, bounds.y + bounds.height * maxY),
    };
  }

  function pickNearestAnchor(point, anchors) {
    let best = anchors[0];
    let bestDistance = Infinity;
    anchors.forEach((anchor, index) => {
      const distance = Math.hypot(point.x - anchor.x, point.y - anchor.y);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = { ...anchor, index };
      }
    });
    return best;
  }

  function themePalette(dark) {
    return dark
      ? {
          cream: "#fff3df",
          ivory: "#fffbf1",
          blush: "#f2c1be",
          apricot: "#efcfad",
          ochre: "#d7b169",
          sage: "#b9d0bf",
          teal: "#b7e3e2",
          sea: "#dfeadf",
          slate: "#d2e4df",
          moss: "#b0d0b7",
          shadow: "#8ca197",
        }
      : {
          cream: "#fcf4e3",
          ivory: "#fffdf6",
          blush: "#d9a2a2",
          apricot: "#e8c49f",
          ochre: "#c79f54",
          sage: "#9bb5a2",
          teal: "#7ebcc0",
          sea: "#dbe8df",
          slate: "#7d9aa0",
          moss: "#88aa92",
          shadow: "#6c7e74",
        };
  }

  function envelope(age, fadeInEnd = 0.14, fadeOutStart = 0.84) {
    const enter = smooth(0, fadeInEnd, age);
    const exit = 1 - smooth(fadeOutStart, 1, age);
    return clamp(enter * exit, 0, 1);
  }

  function drawTeardropPetal(ctx, size, fill, edge, vein, twist = 0) {
    ctx.beginPath();
    ctx.moveTo(0, size * 0.1);
    ctx.bezierCurveTo(size * 0.18, -size * 0.12, size * 0.96, -size * 0.18, size * 0.92, -size * 0.52);
    ctx.bezierCurveTo(size * 0.83, -size * 0.96, size * 0.2, -size * 1.08, 0, -size * 1.1);
    ctx.bezierCurveTo(-size * 0.2, -size * 1.08, -size * 0.83, -size * 0.96, -size * 0.92, -size * 0.52);
    ctx.bezierCurveTo(-size * 0.96, -size * 0.18, -size * 0.18, -size * 0.12, 0, size * 0.1);
    ctx.closePath();
    const wash = ctx.createLinearGradient(0, -size, 0, size * 0.1);
    wash.addColorStop(0, fill);
    wash.addColorStop(1, `${fill}99`);
    ctx.fillStyle = wash;
    ctx.fill();
    ctx.save();
    ctx.globalAlpha *= 0.35;
    ctx.lineWidth = Math.max(0.55, size * 0.055);
    ctx.strokeStyle = edge;
    ctx.stroke();
    if (vein) {
      ctx.beginPath();
      ctx.moveTo(0, size * 0.02);
      ctx.quadraticCurveTo(size * 0.12 * twist, -size * 0.46, size * 0.02, -size * 0.96);
      ctx.strokeStyle = vein;
      ctx.lineWidth = Math.max(0.35, size * 0.025);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawSparkle(ctx, size, fill, opacity = 1) {
    ctx.globalAlpha *= opacity;
    ctx.strokeStyle = fill;
    ctx.lineWidth = Math.max(0.65, size * 0.08);
    ctx.beginPath();
    ctx.moveTo(-size, 0);
    ctx.lineTo(size, 0);
    ctx.moveTo(0, -size);
    ctx.lineTo(0, size);
    ctx.moveTo(-size * 0.45, -size * 0.45);
    ctx.lineTo(size * 0.45, size * 0.45);
    ctx.moveTo(-size * 0.45, size * 0.45);
    ctx.lineTo(size * 0.45, -size * 0.45);
    ctx.stroke();
  }

  function botanicalSpawn(bounds, point, now) {
    const anchors = [
      boundsPoint(bounds, 0.43, 0.28),
      boundsPoint(bounds, 0.74, 0.17),
      boundsPoint(bounds, 0.80, 0.40),
    ];
    const focus = pickNearestAnchor(point, anchors);
    const total = 22;
    const petals = [];
    for (let index = 0; index < total; index += 1) {
      const anchor = anchors[(focus.index + index) % anchors.length];
      const life = 1850 + Math.random() * 520;
      petals.push(mk("botanical", "petal", now + index * 44, life, {
        anchorX: anchor.x + (Math.random() - 0.5) * bounds.width * 0.018,
        anchorY: anchor.y + (Math.random() - 0.5) * bounds.height * 0.016,
        driftX: (Math.random() - 0.5) * bounds.width * 0.16 + (point.x - anchor.x) * 0.04,
        driftY: bounds.height * (0.28 + Math.random() * 0.28),
        sway: bounds.width * (0.01 + Math.random() * 0.014),
        spin: Math.random() * TAU,
        size: bounds.width * (0.013 + Math.random() * 0.007),
        tint: index % 4,
        curl: Math.random() * 0.9 + 0.2,
        offset: Math.random() * TAU,
      }));
    }
    return petals;
  }

  function mountainSpawn(bounds, point, now) {
    const focus = clampPointToRegion(point, bounds, 0.2, 0.75, 0.22, 0.4);
    const spread = bounds.width * (0.28 + Math.random() * 0.14);
    const baseY = focus.y + bounds.height * (Math.random() * 0.03 - 0.015);
    const birds = [];
    for (let index = 0; index < 7; index += 1) {
      const t = index / 6;
      const startX = clamp(
        focus.x - spread * 0.5 + spread * t + (Math.random() - 0.5) * bounds.width * 0.04,
        bounds.x + bounds.width * 0.18,
        bounds.x + bounds.width * 0.76
      );
      const startY = clamp(
        baseY + (t - 0.5) * bounds.height * 0.05 + (Math.random() - 0.5) * bounds.height * 0.025,
        bounds.y + bounds.height * 0.2,
        bounds.y + bounds.height * 0.4
      );
      const endX = clamp(startX + bounds.width * (0.18 + Math.random() * 0.16), bounds.x + bounds.width * 0.2, bounds.x + bounds.width * 0.83);
      const endY = clamp(startY - bounds.height * (0.02 + Math.random() * 0.05), bounds.y + bounds.height * 0.16, bounds.y + bounds.height * 0.36);
      birds.push(mk("mountain", "bird", now + index * 88, 1880 + Math.random() * 540, {
        startX, startY, ctrlX: lerp(startX, endX, 0.52) + (Math.random() - 0.5) * bounds.width * 0.03,
        ctrlY: Math.min(startY, endY) - bounds.height * (0.06 + Math.random() * 0.07),
        endX, endY,
        span: bounds.width * (0.018 + Math.random() * 0.008),
        seed: Math.random() * TAU,
      }));
    }
    return birds;
  }

  function meadowSpawn(bounds, point, now) {
    const centerX = bounds.x + bounds.width * 0.5;
    const breezeSign = point.x >= centerX ? -1 : 1;
    const tufts = [];
    for (let index = 0; index < 18; index += 1) {
      const life = 1820 + Math.random() * 520;
      const baseX = clamp(point.x + (Math.random() - 0.5) * bounds.width * 0.34, bounds.x + bounds.width * 0.14, bounds.x + bounds.width * 0.86);
      const baseY = bounds.y + bounds.height * (0.52 + Math.random() * 0.26);
      tufts.push(mk("meadow", "tuft", now + index * 34, life, {
        baseX,
        baseY,
        driftX: breezeSign * bounds.width * (0.08 + Math.random() * 0.1) + (Math.random() - 0.5) * bounds.width * 0.04,
        driftY: -bounds.height * (0.14 + Math.random() * 0.12),
        stalk: bounds.height * (0.05 + Math.random() * 0.04),
        tuft: bounds.width * (0.012 + Math.random() * 0.006),
        filaments: 7 + Math.floor(Math.random() * 4),
        seed: Math.random() * TAU,
      }));
    }
    return tufts;
  }

  function pondSpawn(bounds, point, now) {
    const water = clampPointToRegion(point, bounds, 0.28, 0.92, 0.44, 0.86);
    const rippleOffsets = [
      [0, 0],
      [bounds.width * 0.02, -bounds.height * 0.01],
      [-bounds.width * 0.018, bounds.height * 0.012],
      [bounds.width * 0.03, bounds.height * 0.004],
    ];
    const particles = rippleOffsets.map((offset, index) => mk("pond", "ripple", now + index * 112, 1980 + Math.random() * 470, {
      cx: water.x + offset[0],
      cy: water.y + offset[1],
      rx: Math.min(bounds.width * (0.024 + Math.random() * 0.008),
        (water.x - bounds.x) * 0.065, (bounds.x + bounds.width - water.x) * 0.065),
      ry: Math.min(bounds.height * (0.011 + Math.random() * 0.004),
        (bounds.y + bounds.height * 0.97 - water.y) / 8),
      wobble: Math.random() * 0.6 + 0.2,
      phase: Math.random() * TAU,
    }));
    particles.push(mk("pond", "dragonfly", now + 85, 2260 + Math.random() * 360, {
      startX: bounds.x + bounds.width * 0.8,
      startY: bounds.y + bounds.height * 0.3,
      ctrlX: lerp(bounds.x + bounds.width * 0.8, water.x, 0.48) + (Math.random() - 0.5) * bounds.width * 0.04,
      ctrlY: Math.min(bounds.y + bounds.height * 0.3, water.y) - bounds.height * (0.06 + Math.random() * 0.05),
      endX: clamp(water.x + (Math.random() - 0.5) * bounds.width * 0.08, bounds.x + bounds.width * 0.44, bounds.x + bounds.width * 0.92),
      endY: clamp(water.y + (Math.random() - 0.5) * bounds.height * 0.06, bounds.y + bounds.height * 0.28, bounds.y + bounds.height * 0.72),
      span: bounds.width * (0.012 + Math.random() * 0.004),
      body: bounds.width * (0.018 + Math.random() * 0.004),
      seed: Math.random() * TAU,
    }));
    return particles;
  }

  function fernSpawn(bounds, point, now) {
    const bases = [0.46, 0.53, 0.6].map((nx, index) => ({
      x: bounds.x + bounds.width * nx,
      y: bounds.y + bounds.height * (0.865 + index * 0.002),
    }));
    const focus = pickNearestAnchor(point, bases);
    return bases.map((base, index) => mk("fern", "shoot", now + index * 122, 2420 + Math.random() * 500, {
      baseX: base.x,
      baseY: base.y,
      lean: (point.x - base.x) * 0.05 + (index - 1) * bounds.width * 0.012 + (Math.random() - 0.5) * bounds.width * 0.02,
      rise: bounds.height * (0.16 + Math.random() * 0.05),
      curlDir: index === focus.index ? 1 : index % 2 === 0 ? -1 : 1,
      curl: bounds.width * (0.022 + Math.random() * 0.01),
      leaflets: 5 + index,
      seed: Math.random() * TAU,
    }));
  }

  function roseSpawn(bounds, point, now) {
    const anchors = [
      boundsPoint(bounds, 285 / 1100, 341 / 730),
      boundsPoint(bounds, 611 / 1100, 155 / 730),
      boundsPoint(bounds, 816 / 1100, 345 / 730),
    ];
    const focus = pickNearestAnchor(point, anchors);
    const particles = [];
    anchors.forEach((anchor, index) => {
      particles.push(mk("rose", "bloom", now + index * 88, 2480 + Math.random() * 500, {
        cx: anchor.x,
        cy: anchor.y,
        scale: bounds.width * (0.04 + Math.random() * 0.005),
        opening: 0.72 + Math.random() * 0.28,
        bloom: index === focus.index ? 1.1 : 0.92 + Math.random() * 0.08,
        seed: Math.random() * TAU,
      }));
    });
    const petalsPerBloom = [4, 4, 4];
    anchors.forEach((anchor, index) => {
      for (let petal = 0; petal < petalsPerBloom[index]; petal += 1) {
        const angle = petal / petalsPerBloom[index] * TAU + Math.random() * 0.7;
        particles.push(mk("rose", "petal", now + 70 + index * 40 + petal * 48, 1800 + Math.random() * 540, {
          cx: anchor.x,
          cy: anchor.y,
          angle,
          radius: bounds.width * (0.014 + Math.random() * 0.016),
          drift: bounds.width * (0.06 + Math.random() * 0.05),
          lift: -bounds.height * (0.03 + Math.random() * 0.05),
          spin: (Math.random() - 0.5) * 4.2,
          curl: 0.3 + Math.random() * 0.4,
          scale: bounds.width * (0.01 + Math.random() * 0.006),
          tint: index,
          seed: Math.random() * TAU,
        }));
      }
    });
    return particles;
  }

  function coastSpawn(bounds, point, now) {
    const impact = clamp((point.x - bounds.x) / bounds.width, 0.35, 0.82);
    const crests = [];
    for (let index = 0; index < 3; index += 1) {
      const shift = index * 0.014 + (impact - 0.55) * 0.025;
      crests.push(mk("coast", "crest", now + index * 220, 2240 + Math.random() * 520, {
        startX: bounds.x + bounds.width * 0.55,
        startY: bounds.y + bounds.height * (0.66 + shift),
        ctrl1X: bounds.x + bounds.width * 0.65,
        ctrl1Y: bounds.y + bounds.height * (0.7 + shift),
        ctrl2X: bounds.x + bounds.width * 0.77,
        ctrl2Y: bounds.y + bounds.height * (0.77 + shift),
        endX: bounds.x + bounds.width * 0.91,
        endY: bounds.y + bounds.height * (0.78 + shift),
        advance: bounds.height * 0.026,
        width: clamp(bounds.width / 650, 0.8, 1.6),
      }));
    }
    for (let index = 0; index < 4; index += 1) {
      crests.push(mk("coast", "glint", now + 128 + index * 52, 760 + Math.random() * 360, {
        x: bounds.x + bounds.width * (0.43 + Math.random() * 0.42),
        y: bounds.y + bounds.height * (0.72 + Math.random() * 0.14),
        size: clamp(bounds.width * 0.0025, 0.9, 2.5),
        seed: Math.random() * TAU,
      }));
    }
    return crests;
  }

  function spawn(scene, bounds, point, now) {
    validateScene(scene, "spawn");
    validateBounds(bounds, "spawn");
    validatePoint(point, "spawn");
    validateNow(now, "spawn");
    switch (scene) {
      case "botanical":
        return botanicalSpawn(bounds, point, now);
      case "mountain":
        return mountainSpawn(bounds, point, now);
      case "meadow":
        return meadowSpawn(bounds, point, now);
      case "pond":
        return pondSpawn(bounds, point, now);
      case "fern":
        return fernSpawn(bounds, point, now);
      case "rose":
        return roseSpawn(bounds, point, now);
      case "coast":
        return coastSpawn(bounds, point, now);
      default:
        fail("spawn", `unsupported scene "${scene}"`);
    }
  }

  function drawBotanical(ctx, particle, age, dark) {
    const palette = themePalette(dark);
    const t = clamp(age, 0, 1);
    const fade = envelope(t, 0.12, 0.88);
    const travel = easeInOut(t);
    const x = particle.anchorX + particle.driftX * travel + Math.sin(t * 6.2 + particle.offset) * particle.sway;
    const y = particle.anchorY + particle.driftY * travel + t * t * particle.driftY * 0.18;
    const angle = particle.spin + t * (0.9 + particle.curl * 0.45) + Math.sin(t * TAU * 1.7 + particle.offset) * 0.18;
    const size = particle.size * (0.5 + t * 0.8);
    ctx.globalAlpha = fade;
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(1, 0.92 + t * 0.16);
    const fill = [palette.ivory, palette.cream, palette.apricot, palette.sage][particle.tint];
    drawTeardropPetal(ctx, size * (1.15 + particle.curl * 0.08), fill, palette.ochre, palette.shadow, particle.curl);
    ctx.globalAlpha *= 0.28;
    ctx.strokeStyle = palette.ochre;
    ctx.lineWidth = Math.max(0.4, size * 0.028);
    ctx.beginPath();
    ctx.moveTo(-size * 0.35, size * 0.02);
    ctx.quadraticCurveTo(0, -size * 0.46, size * 0.2, -size * 1.02);
    ctx.stroke();
  }

  function drawBird(ctx, particle, age, dark) {
    const palette = themePalette(dark);
    const t = clamp(age, 0, 1);
    const fade = envelope(t, 0.1, 0.92);
    const p = easeOut(t);
    const pos = quadPoint(particle.startX, particle.startY, particle.ctrlX, particle.ctrlY, particle.endX, particle.endY, p);
    const flap = Math.sin(t * TAU * 3.4 + particle.seed) * 0.5;
    const s = particle.span * (0.72 + 0.2 * (1 - t));
    ctx.globalAlpha = fade;
    ctx.translate(pos.x, pos.y);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = dark ? palette.ivory : palette.shadow;
    ctx.lineWidth = 1.1 + s * 0.06;
    ctx.beginPath();
    ctx.moveTo(-s, 0);
    ctx.quadraticCurveTo(-s * 0.25, -s * (0.32 + flap * 0.26), 0, 0);
    ctx.quadraticCurveTo(s * 0.25, -s * (0.32 + flap * 0.26), s, 0);
    ctx.stroke();
    ctx.globalAlpha *= 0.55;
    ctx.lineWidth = 0.85 + s * 0.03;
    ctx.beginPath();
    ctx.moveTo(-s * 0.15, 0);
    ctx.lineTo(s * 0.08, s * 0.12);
    ctx.stroke();
  }

  function drawTuft(ctx, particle, age, dark) {
    const palette = themePalette(dark);
    const t = clamp(age, 0, 1);
    const fade = envelope(t, 0.12, 0.9);
    const move = easeOut(t);
    const x = particle.baseX + particle.driftX * move + Math.sin(t * TAU * 2.4 + particle.seed) * particle.tuft * 0.55;
    const y = particle.baseY + particle.driftY * move - t * t * particle.stalk * 0.45;
    ctx.globalAlpha = fade * 0.88;
    ctx.translate(x, y);
    ctx.rotate(Math.sin(t * TAU + particle.seed) * 0.2);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = palette.shadow;
    ctx.lineWidth = Math.max(0.65, particle.tuft * 0.08);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(particle.stalk * 0.12, particle.stalk * 0.35, particle.stalk * 0.08, particle.stalk * 0.7);
    ctx.stroke();
    ctx.strokeStyle = dark ? palette.ivory : palette.ochre;
    ctx.lineWidth = Math.max(0.5, particle.tuft * 0.07);
    for (let index = 0; index < particle.filaments; index += 1) {
      const angle = (index / (particle.filaments - 1) - 0.5) * 2.1;
      const tipX = Math.sin(angle) * particle.tuft;
      const tipY = -Math.cos(angle) * particle.tuft * 0.8;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(tipX * 0.35, tipY * 0.8, tipX, tipY);
      ctx.moveTo(tipX - 1.1, tipY - 0.6);
      ctx.lineTo(tipX + 1.1, tipY + 0.3);
      ctx.stroke();
    }
    ctx.fillStyle = palette.ochre;
    ctx.beginPath();
    ctx.ellipse(particle.stalk * 0.08, particle.stalk * 0.72, particle.tuft * 0.13, particle.tuft * 0.23, 0, 0, TAU);
    ctx.fill();
  }

  function drawRipple(ctx, particle, age, dark) {
    const palette = themePalette(dark);
    const t = clamp(age, 0, 1);
    const fade = envelope(t, 0.05, 0.82);
    const growth = easeOut(t);
    const wobble = Math.sin(t * TAU * 2.1 + particle.phase) * particle.wobble;
    const rx = particle.rx * (1.2 + growth * 8.1);
    const ry = particle.ry * (1.1 + growth * 6.4);
    ctx.globalAlpha = fade;
    ctx.translate(particle.cx, particle.cy);
    ctx.rotate(-0.18 + wobble * 0.04);
    ctx.strokeStyle = dark ? palette.teal : palette.sea;
    ctx.lineWidth = 0.95 + (1 - t) * 0.25;
    for (let ring = 0; ring < 3; ring += 1) {
      const ringScale = 0.86 + ring * 0.16;
      const offset = ring * 0.08;
      ctx.globalAlpha = fade * (0.7 - ring * 0.14);
      ctx.beginPath();
      ctx.ellipse(0, 0, rx * ringScale, ry * (0.82 + ring * 0.1), 0, 0, TAU);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(rx * 0.1 * offset, -ry * 0.12 * offset, rx * ringScale * 0.46, ry * (0.4 + ring * 0.06), 0.16, Math.PI * 0.1, Math.PI * 0.92);
      ctx.strokeStyle = palette.ivory;
      ctx.lineWidth = 0.75;
      ctx.stroke();
      ctx.strokeStyle = dark ? palette.teal : palette.sea;
      ctx.lineWidth = 0.95;
    }
  }

  function drawDragonfly(ctx, particle, age, dark) {
    const palette = themePalette(dark);
    const t = clamp(age, 0, 1);
    const fade = envelope(t, 0.08, 0.92);
    const pos = quadPoint(particle.startX, particle.startY, particle.ctrlX, particle.ctrlY, particle.endX, particle.endY, easeOut(t));
    const wing = Math.sin(t * TAU * 5.5 + particle.seed) * 0.5 + 0.5;
    ctx.globalAlpha = fade;
    ctx.translate(pos.x, pos.y);
    ctx.rotate(Math.sin(t * TAU * 0.8 + particle.seed) * 0.08);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = dark ? palette.ivory : palette.shadow;
    ctx.lineWidth = 1.05;
    ctx.beginPath();
    ctx.moveTo(-particle.body * 0.48, 0);
    ctx.lineTo(particle.body * 0.48, 0);
    ctx.stroke();
    ctx.fillStyle = dark ? palette.teal : palette.slate;
    ctx.beginPath();
    ctx.ellipse(-particle.body * 0.18, 0, particle.body * 0.12, particle.body * 0.07, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(particle.body * 0.34, 0, particle.body * 0.07, 0, TAU);
    ctx.fill();
    ctx.globalAlpha *= 0.46;
    ctx.strokeStyle = palette.ivory;
    ctx.lineWidth = 0.7;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(side * particle.span * 0.42, -particle.span * (0.86 + wing * 0.38), side * particle.span * 1.05, side * particle.span * 0.08);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(side * particle.span * 0.42, particle.span * (0.44 + wing * 0.18), side * particle.span * 0.98, side * particle.span * 0.14);
      ctx.stroke();
    }
  }

  function drawFern(ctx, particle, age, dark) {
    const palette = themePalette(dark);
    const t = clamp(age, 0, 1);
    const fade = envelope(t, 0.1, 0.9);
    const g = easeOut(t);
    const tipX = particle.baseX + particle.lean * g;
    const tipY = particle.baseY - particle.rise * g;
    const controlX = particle.baseX + particle.lean * 0.42 + Math.sin(t * TAU * 1.1 + particle.seed) * particle.curl * 0.12;
    const controlY = particle.baseY - particle.rise * 0.58;
    ctx.globalAlpha = fade;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = dark ? palette.moss : palette.shadow;
    ctx.lineWidth = 0.9 + particle.curl * 0.045;
    ctx.beginPath();
    ctx.moveTo(particle.baseX, particle.baseY);
    ctx.quadraticCurveTo(controlX, controlY, tipX, tipY);
    ctx.stroke();
    const leafletOpen = smooth(0.12, 0.82, t);
    const leafletCount = particle.leaflets;
    for (let index = 0; index < leafletCount; index += 1) {
      const u = (index + 1) / (leafletCount + 1);
      const grown = clamp((t - u * 0.38) / 0.38, 0, 1);
      if (grown <= 0) continue;
      const pos = quadPoint(particle.baseX, particle.baseY, controlX, controlY, tipX, tipY, u);
      const len = particle.curl * (0.7 + grown) * (1.2 - u * 0.4);
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate(side * (0.65 + leafletOpen * 0.55));
        ctx.globalAlpha = fade * grown * 0.9;
        ctx.fillStyle = side < 0 ? palette.sage : palette.moss;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(-len * 0.25, -len * 0.3, -len * 0.22, -len * 0.72, 0, -len);
        ctx.bezierCurveTo(len * 0.25, -len * 0.65, len * 0.28, -len * 0.2, 0, 0);
        ctx.fill();
        ctx.globalAlpha *= 0.4;
        ctx.strokeStyle = palette.ivory;
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -len * 0.8);
        ctx.stroke();
        ctx.restore();
      }
    }
    ctx.save();
    ctx.translate(tipX, tipY);
    ctx.rotate(particle.curlDir * 0.12 + Math.sin(t * TAU * 0.8 + particle.seed) * 0.12);
    ctx.globalAlpha = fade;
    ctx.strokeStyle = palette.moss;
    ctx.lineWidth = 1.15;
    const coil = particle.curl * (1.1 - g * 0.72);
    ctx.beginPath();
    ctx.arc(0, 0, coil * 0.88, Math.PI * 0.05, Math.PI * (1.55 - g * 0.95), false);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(coil * 0.32 * particle.curlDir, coil * 0.06, coil * 0.42, Math.PI * 0.9, Math.PI * 3.1, true);
    ctx.stroke();
    ctx.restore();
  }

  function drawRoseBloom(ctx, particle, age, dark) {
    const palette = themePalette(dark);
    const t = clamp(age, 0, 1);
    const fade = envelope(t, 0.08, 0.88);
    const open = easeOut(t) * particle.opening;
    const size = particle.scale * (0.72 + open * 0.62) * particle.bloom;
    ctx.globalAlpha = fade * (dark ? 0.42 : 0.32);
    ctx.translate(particle.cx, particle.cy);
    ctx.rotate(Math.sin(t * TAU * 0.7 + particle.seed) * 0.08);
    const wash = ctx.createRadialGradient(0, -size * 0.18, 0, 0, -size * 0.4, size);
    wash.addColorStop(0, palette.blush);
    wash.addColorStop(0.62, palette.apricot);
    wash.addColorStop(1, palette.cream);
    for (let index = 0; index < 5; index += 1) {
      ctx.save();
      ctx.rotate(index / 5 * TAU + particle.seed * 0.08);
      ctx.scale(0.85 + open * 0.15, 0.8 + open * 0.2);
      ctx.fillStyle = wash;
      ctx.beginPath();
      ctx.moveTo(0, size * 0.1);
      ctx.bezierCurveTo(-size * 0.7, -size * 0.1, -size * 0.85, -size * 0.9, -size * 0.25, -size);
      ctx.quadraticCurveTo(0, -size * 1.1, size * 0.18, -size * 0.95);
      ctx.bezierCurveTo(size * 0.9, -size, size * 0.7, -size * 0.05, 0, size * 0.1);
      ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = fade * 0.48;
    ctx.strokeStyle = palette.ochre;
    ctx.fillStyle = palette.ochre;
    ctx.lineWidth = 0.55;
    for (let index = 0; index < 9; index += 1) {
      const angle = index / 9 * TAU;
      const x = Math.cos(angle) * size * 0.22;
      const y = Math.sin(angle) * size * 0.22;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, size * 0.035, 0, TAU);
      ctx.fill();
    }
  }

  function drawRosePetal(ctx, particle, age, dark) {
    const palette = themePalette(dark);
    const t = clamp(age, 0, 1);
    const fade = envelope(t, 0.1, 0.86);
    const move = easeOut(t);
    const swirl = particle.angle + particle.spin * t * 0.18;
    const radius = particle.radius + particle.drift * move;
    const x = particle.cx + Math.cos(swirl) * radius;
    const y = particle.cy + Math.sin(swirl) * radius * 0.62 + particle.lift * t + Math.sin(t * TAU * 1.5 + particle.seed) * 1.6;
    ctx.globalAlpha = fade;
    ctx.translate(x, y);
    ctx.rotate(swirl * 0.5 + particle.curl * t);
    ctx.scale(1 + t * 0.16, 0.85 + t * 0.12);
    drawTeardropPetal(
      ctx,
      particle.scale * (1.05 + t * 0.35),
      particle.tint === 1 ? palette.blush : particle.tint === 2 ? palette.apricot : palette.cream,
      palette.blush,
      palette.cream,
      particle.curl > 0.5 ? 1 : -1
    );
    ctx.globalAlpha *= 0.36;
    ctx.strokeStyle = palette.blush;
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(-particle.scale * 0.4, particle.scale * 0.08);
    ctx.quadraticCurveTo(0, -particle.scale * 0.32, particle.scale * 0.22, -particle.scale * 0.9);
    ctx.stroke();
  }

  function drawCrest(ctx, particle, age, dark) {
    const palette = themePalette(dark);
    const t = clamp(age, 0, 1);
    const fade = envelope(t, 0.04, 0.86);
    const advance = Math.sin(t * Math.PI) * particle.advance;
    ctx.globalAlpha = fade * 0.75;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const foam = ctx.createLinearGradient(particle.startX, particle.startY, particle.endX, particle.endY);
    // Retain the pigment RGB at transparent stops to avoid dark gradient fringes.
    foam.addColorStop(0, `${palette.ivory}00`);
    foam.addColorStop(0.18, palette.ivory);
    foam.addColorStop(0.72, palette.ivory);
    foam.addColorStop(1, `${palette.ivory}00`);
    ctx.strokeStyle = foam;
    ctx.lineWidth = particle.width;
    ctx.beginPath();
    ctx.moveTo(particle.startX, particle.startY + advance);
    ctx.bezierCurveTo(particle.ctrl1X, particle.ctrl1Y + advance, particle.ctrl2X, particle.ctrl2Y + advance, particle.endX, particle.endY + advance);
    ctx.stroke();
  }

  function drawGlint(ctx, particle, age, dark) {
    const palette = themePalette(dark);
    const t = clamp(age, 0, 1);
    const fade = envelope(t, 0.18, 0.72);
    const shimmer = 0.7 + Math.sin(t * TAU * 2.8 + particle.seed) * 0.3;
    ctx.globalAlpha = fade;
    ctx.translate(particle.x, particle.y);
    ctx.rotate(Math.sin(particle.seed) * 0.5);
    drawSparkle(ctx, particle.size * shimmer * 2.2, dark ? palette.apricot : palette.ochre, 0.9);
  }

  function draw(ctx, particle, age, dark) {
    if (!particle || typeof particle !== "object") fail("draw", "particle must be an object");
    if (!SCENES.has(particle.scene)) fail("draw", `particle.scene must be one of ${[...SCENES].join(", ")}`);
    if (typeof particle.kind !== "string") fail("draw", "particle.kind must be a string");
    if (!isFiniteNumber(age)) fail("draw", "age must be a finite number");
    if (!ctx || typeof ctx !== "object") fail("draw", "ctx must be a 2D rendering context");
    switch (particle.scene) {
      case "botanical":
        if (particle.kind !== "petal") fail("draw", "botanical particles must use kind \"petal\"");
        return drawBotanical(ctx, particle, age, dark);
      case "mountain":
        if (particle.kind !== "bird") fail("draw", "mountain particles must use kind \"bird\"");
        return drawBird(ctx, particle, age, dark);
      case "meadow":
        if (particle.kind !== "tuft") fail("draw", "meadow particles must use kind \"tuft\"");
        return drawTuft(ctx, particle, age, dark);
      case "pond":
        if (particle.kind === "ripple") return drawRipple(ctx, particle, age, dark);
        if (particle.kind === "dragonfly") return drawDragonfly(ctx, particle, age, dark);
        fail("draw", "pond particles must use kind \"ripple\" or \"dragonfly\"");
        break;
      case "fern":
        if (particle.kind !== "shoot") fail("draw", "fern particles must use kind \"shoot\"");
        return drawFern(ctx, particle, age, dark);
      case "rose":
        if (particle.kind === "bloom") return drawRoseBloom(ctx, particle, age, dark);
        if (particle.kind === "petal") return drawRosePetal(ctx, particle, age, dark);
        fail("draw", "rose particles must use kind \"bloom\" or \"petal\"");
        break;
      case "coast":
        if (particle.kind === "crest") return drawCrest(ctx, particle, age, dark);
        if (particle.kind === "glint") return drawGlint(ctx, particle, age, dark);
        fail("draw", "coast particles must use kind \"crest\" or \"glint\"");
        break;
      default:
        fail("draw", `unsupported scene "${particle.scene}"`);
    }
  }

  return { spawn, draw };
})();
