const root = document.documentElement;
const languageButton = document.querySelector(".lang-toggle");
const themeButton = document.querySelector(".theme-toggle");
const effectsButton = document.querySelector(".effects-toggle");
const sceneButtons = [...document.querySelectorAll(".scene-art")];
const sceneStatus = document.getElementById("scene-status");
const menuButton = document.querySelector(".menu-toggle");
const navigation = document.querySelector(".desktop-nav");
const navLinks = [...navigation.querySelectorAll("a")];
const filters = [...document.querySelectorAll(".filter")];
const projectCards = [...document.querySelectorAll(".project-card")];
const filterStatus = document.getElementById("filter-status");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const mobileNavigation = window.matchMedia("(max-width: 900px)");
let language = sitePreferences.get("language") === "zh" ? "zh" : "en";
let selectedFilter = "all";
let effectsEnabled = sitePreferences.get("effects") !== "off";
let themeTransition = null;

function updateControlLabels() {
  const chinese = language === "zh";
  const dark = root.dataset.theme === "dark";
  const menuOpen = menuButton.getAttribute("aria-expanded") === "true";
  themeButton.setAttribute("aria-label", chinese
    ? `切换到${dark ? "浅色" : "深色"}主题`
    : `Switch to ${dark ? "light" : "dark"} theme`);
  const languageLabel = chinese ? "Switch to English" : "切换到中文";
  languageButton.setAttribute("aria-label", languageLabel);
  languageButton.title = languageLabel;
  menuButton.setAttribute("aria-label", chinese
    ? `${menuOpen ? "关闭" : "打开"}导航`
    : `${menuOpen ? "Close" : "Open"} navigation`);
  navigation.setAttribute("aria-label", chinese ? "主导航" : "Primary navigation");
  document.querySelector(".project-filters").setAttribute("aria-label", chinese ? "筛选项目" : "Filter projects");
  const effectsActive = effectsEnabled && !reducedMotion.matches;
  effectsButton.setAttribute("aria-pressed", String(effectsActive));
  effectsButton.disabled = reducedMotion.matches;
  effectsButton.textContent = reducedMotion.matches
    ? (chinese ? "已减少动态效果" : "Reduced motion")
    : (chinese ? `花园动效${effectsActive ? "开启" : "关闭"}` : `Garden effects ${effectsActive ? "on" : "off"}`);
  effectsButton.setAttribute("aria-label", chinese
    ? (effectsActive ? "暂停花园动效" : "开启花园动效")
    : (effectsActive ? "Pause garden effects" : "Enable garden effects"));
  updateSceneControls();
}

function updateSceneControls() {
  const chinese = language === "zh";
  const reasons = chinese
    ? { loading: "画作加载中", unavailable: "画作动效暂不可用", paused: "花园动效已暂停", reduced: "已减少动态效果" }
    : { loading: "Loading painting", unavailable: "Painting effects unavailable", paused: "Garden effects paused", reduced: "Reduced motion" };
  sceneButtons.forEach((button) => {
    const image = button.querySelector("img");
    const layer = sceneLayers.get(button.dataset.scene);
    const texture = button.dataset.scene === "fern" ? fernAtlas
      : button.dataset.scene === "pond" ? pondMask : null;
    const state = !sceneRuntime || !petalContext || (layer && !layer.context) ? "unavailable"
      : !image.complete || (texture && !texture.complete) ? "loading"
      : !image.naturalWidth || (texture && !texture.naturalWidth) ? "unavailable"
      : reducedMotion.matches ? "reduced"
      : !effectsEnabled ? "paused" : "ready";
    button.disabled = state !== "ready";
    button.dataset.state = state;
    const label = chinese ? button.dataset.labelZh : button.dataset.labelEn;
    const description = state === "ready" ? label : `${label} (${reasons[state]})`;
    button.setAttribute("aria-label", description);
    button.title = description;
    button.querySelector(".scene-state").textContent = state === "ready" ? "" : reasons[state];
  });
}

function updateFilterStatus() {
  const count = projectCards.filter((card) => !card.hidden).length;
  const category = filters.find((filter) => filter.dataset.filter === selectedFilter).dataset[language];
  filterStatus.textContent = language === "zh"
    ? `${category}：显示 ${count} 个项目`
    : `${category}: showing ${count} ${count === 1 ? "project" : "projects"}`;
}

function applyLanguage(nextLanguage) {
  language = nextLanguage;
  root.lang = language === "zh" ? "zh-CN" : "en";
  document.querySelectorAll("[data-en][data-zh]").forEach((element) => {
    element.textContent = element.dataset[language];
  });
  updateControlLabels();
  updateFilterStatus();
  scheduleScrollUpdate();
}

function setTheme(theme) {
  root.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]').content = theme === "dark" ? "#0d151d" : "#176f9f";
  updateControlLabels();
}

themeButton.addEventListener("click", () => {
  const current = sitePreferences.get("theme") || root.dataset.theme;
  const theme = current === "dark" ? "light" : "dark";
  sitePreferences.set("theme", theme);
  themeTransition?.skipTransition();
  if (reducedMotion.matches || !document.startViewTransition) {
    setTheme(theme);
    return;
  }

  const rect = themeButton.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const feather = 32;
  const radius = Math.ceil(Math.hypot(
    Math.max(x, innerWidth - x),
    Math.max(y, innerHeight - y),
  )) + feather;
  root.style.setProperty("--theme-origin-x", `${x}px`);
  root.style.setProperty("--theme-origin-y", `${y}px`);
  root.style.setProperty("--theme-radius", `${radius}px`);
  root.style.setProperty("--theme-feather", `${feather}px`);
  root.dataset.themeTransition = "active";
  // A queued snapshot callback must apply the latest click, not an older request.
  const transition = document.startViewTransition(() => setTheme(sitePreferences.get("theme")));
  themeTransition = transition;
  transition.ready.catch((error) => {
    if (error.name !== "AbortError") console.warn("Theme animation was skipped:", error);
  });
  transition.finished.finally(() => {
    if (themeTransition !== transition) return;
    themeTransition = null;
    delete root.dataset.themeTransition;
    ["--theme-origin-x", "--theme-origin-y", "--theme-radius", "--theme-feather"]
      .forEach((property) => root.style.removeProperty(property));
  });
});

// Root snapshots receive pointer clicks instead of the underlying theme button.
document.addEventListener("click", (event) => {
  if (!themeTransition || event.target !== root) return;
  const rect = themeButton.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right
    || event.clientY < rect.top || event.clientY > rect.bottom) return;
  event.stopImmediatePropagation();
  themeButton.focus({ preventScroll: true });
  themeButton.click();
}, true);

reducedMotion.addEventListener("change", (event) => {
  if (event.matches) themeTransition?.skipTransition();
});

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (event) => {
  if (!sitePreferences.get("theme")) {
    setTheme(event.matches ? "dark" : "light");
  }
});

languageButton.addEventListener("click", () => {
  const nextLanguage = language === "zh" ? "en" : "zh";
  sitePreferences.set("language", nextLanguage);
  applyLanguage(nextLanguage);
});

function setMenu(open) {
  navigation.classList.toggle("is-open", open);
  menuButton.setAttribute("aria-expanded", String(open));
  updateControlLabels();
}

menuButton.addEventListener("click", () => {
  setMenu(menuButton.getAttribute("aria-expanded") !== "true");
});

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    const destination = document.querySelector(link.getAttribute("href"));
    if (mobileNavigation.matches) {
      setMenu(false);
      // Keep keyboard focus at the destination when its menu link is hidden.
      destination.tabIndex = -1;
      destination.focus({ preventScroll: true });
    }
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && menuButton.getAttribute("aria-expanded") === "true") {
    setMenu(false);
    menuButton.focus();
  }
});

document.addEventListener("click", (event) => {
  if (menuButton.getAttribute("aria-expanded") === "true" && !event.target.closest(".site-header")) {
    setMenu(false);
  }
});

document.querySelector(".site-header").addEventListener("focusout", (event) => {
  if (menuButton.getAttribute("aria-expanded") === "true" && !event.currentTarget.contains(event.relatedTarget)) {
    setMenu(false);
  }
});

mobileNavigation.addEventListener("change", () => {
  const focusWillHide = mobileNavigation.matches && navigation.contains(document.activeElement);
  setMenu(false);
  if (focusWillHide) menuButton.focus();
});

let filterAnimations = [];

function stopFilterAnimations() {
  filterAnimations.forEach((animation) => animation.cancel());
  filterAnimations = [];
}

filters.forEach((filter) => {
  filter.addEventListener("click", () => {
    stopFilterAnimations();
    clearSpotlights();
    selectedFilter = filter.dataset.filter;
    filters.forEach((item) => {
      const active = item === filter;
      item.classList.toggle("active", active);
      item.setAttribute("aria-pressed", String(active));
    });
    projectCards.forEach((card) => {
      card.hidden = selectedFilter !== "all" && !card.dataset.category.split(" ").includes(selectedFilter);
    });
    if (!reducedMotion.matches) {
      filterAnimations = projectCards.filter((card) => !card.hidden).map((card, index) =>
        card.animate(
          [{ opacity: 0, translate: "0 12px" }, { opacity: 1, translate: "0 0" }],
          { duration: 350, delay: index * 45, easing: "cubic-bezier(.2,.7,.3,1)", fill: "backwards" }
        )
      );
    }
    updateFilterStatus();
    scheduleScrollUpdate();
  });
});
reducedMotion.addEventListener("change", stopFilterAnimations);

let scrollFrame = null;
const sections = navLinks.map((link) => document.querySelector(link.getAttribute("href")));

function updateScrollState() {
  scrollFrame = null;
  const scrollable = root.scrollHeight - window.innerHeight;
  const progress = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
  root.style.setProperty("--reading-progress", progress.toFixed(4));
  let current = null;
  for (const section of sections) {
    if (section.getBoundingClientRect().top <= 170) current = section.id;
  }
  navLinks.forEach((link) => {
    if (link.hash === `#${current}`) {
      link.setAttribute("aria-current", "location");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

function scheduleScrollUpdate() {
  if (scrollFrame === null) scrollFrame = requestAnimationFrame(updateScrollState);
}

window.addEventListener("scroll", scheduleScrollUpdate, { passive: true });
window.addEventListener("resize", scheduleScrollUpdate, { passive: true });
window.addEventListener("load", scheduleScrollUpdate);

const revealElements = [...document.querySelectorAll(
  ".reveal, .section-heading, .about-title, .about-content, .contact-section > h2"
)];
if ("IntersectionObserver" in window && !reducedMotion.matches) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.06 });
  revealElements.forEach((element) => {
    if (element.getBoundingClientRect().top >= window.innerHeight) {
      element.dataset.revealReady = "";
      observer.observe(element);
    }
  });
  reducedMotion.addEventListener("change", (event) => {
    if (event.matches) {
      observer.disconnect();
      revealElements.forEach((element) => element.classList.add("visible"));
    }
  });
}

const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
const artworks = [...document.querySelectorAll(".hero, .section, .contact-section")];
const paintFrames = new Map();

function canUsePointerEffects(event) {
  return effectsEnabled && !reducedMotion.matches && finePointer.matches &&
    !document.hidden && (!event || event.pointerType === "mouse");
}

function resetArtwork(artwork) {
  const frame = paintFrames.get(artwork);
  if (frame !== undefined) cancelAnimationFrame(frame);
  paintFrames.delete(artwork);
  artwork.classList.remove("nature-hovering");
  artwork.style.removeProperty("--paint-x");
  artwork.style.removeProperty("--paint-y");
  artwork.style.removeProperty("--paint-turn");
}

function pointerPosition(event, element) {
  const bounds = element.getBoundingClientRect();
  return {
    x: Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1)),
    y: Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1)),
    localX: event.clientX - bounds.left,
    localY: event.clientY - bounds.top,
  };
}

artworks.forEach((artwork) => {
  artwork.addEventListener("pointermove", (event) => {
    if (!canUsePointerEffects(event)) return;
    const frame = paintFrames.get(artwork);
    if (frame !== undefined) cancelAnimationFrame(frame);
    paintFrames.set(artwork, requestAnimationFrame(() => {
      paintFrames.delete(artwork);
      const { x, y } = pointerPosition(event, artwork);
      artwork.style.setProperty("--paint-x", `${(x * 20).toFixed(2)}px`);
      artwork.style.setProperty("--paint-y", `${(y * 13).toFixed(2)}px`);
      artwork.style.setProperty("--paint-turn", `${(x * 1.8).toFixed(2)}deg`);
      artwork.classList.add("nature-hovering");
    }));
  });
  artwork.addEventListener("pointerleave", () => resetArtwork(artwork));
  artwork.addEventListener("pointercancel", () => resetArtwork(artwork));
});

const spotlightCards = [...document.querySelectorAll(".project-card, .repo-logo-card, .social-card, .publication")];
const spotlightFrames = new Map();

function clearSpotlight(card) {
  const frame = spotlightFrames.get(card);
  if (frame !== undefined) cancelAnimationFrame(frame);
  spotlightFrames.delete(card);
  card.classList.remove("pointer-lit");
  ["--spot-x", "--spot-y", "--tilt-x", "--tilt-y"].forEach((property) => card.style.removeProperty(property));
}

spotlightCards.forEach((card) => {
  card.addEventListener("pointermove", (event) => {
    if (!canUsePointerEffects(event)) return;
    const frame = spotlightFrames.get(card);
    if (frame !== undefined) cancelAnimationFrame(frame);
    spotlightFrames.set(card, requestAnimationFrame(() => {
      spotlightFrames.delete(card);
      const { x, y, localX, localY } = pointerPosition(event, card);
      card.style.setProperty("--spot-x", `${localX.toFixed(2)}px`);
      card.style.setProperty("--spot-y", `${localY.toFixed(2)}px`);
      card.style.setProperty("--tilt-x", `${(-y * 2.5).toFixed(2)}deg`);
      card.style.setProperty("--tilt-y", `${(x * 3.5).toFixed(2)}deg`);
      card.classList.add("pointer-lit");
    }));
  });
  card.addEventListener("pointerleave", () => clearSpotlight(card));
  card.addEventListener("pointercancel", () => clearSpotlight(card));
});

function clearSpotlights() {
  spotlightCards.forEach(clearSpotlight);
}
const magneticControls = [...document.querySelectorAll(".button, .theme-toggle, .filter")];
const magneticFrames = new Map();

function resetMagnet(control) {
  const frame = magneticFrames.get(control);
  if (frame !== undefined) cancelAnimationFrame(frame);
  magneticFrames.delete(control);
  control.style.removeProperty("--magnet-x");
  control.style.removeProperty("--magnet-y");
}

magneticControls.forEach((control) => {
  control.addEventListener("pointermove", (event) => {
    if (!canUsePointerEffects(event)) return;
    const frame = magneticFrames.get(control);
    if (frame !== undefined) cancelAnimationFrame(frame);
    magneticFrames.set(control, requestAnimationFrame(() => {
      magneticFrames.delete(control);
      const { x, y } = pointerPosition(event, control);
      control.style.setProperty("--magnet-x", `${(x * 4).toFixed(2)}px`);
      control.style.setProperty("--magnet-y", `${(y * 3).toFixed(2)}px`);
    }));
  });
  control.addEventListener("pointerleave", () => resetMagnet(control));
  control.addEventListener("pointercancel", () => resetMagnet(control));
});

const petalCanvas = document.createElement("canvas");
petalCanvas.className = "garden-particles";
petalCanvas.setAttribute("aria-hidden", "true");
document.body.append(petalCanvas);
const petalContext = petalCanvas.getContext("2d");
if (!petalContext) console.warn("Garden petal effects are unavailable: this browser has no 2D canvas context.");
const sceneRuntime = typeof sceneEffects === "undefined" ? null : sceneEffects;
if (!sceneRuntime) console.warn("Painting-specific effects could not load; the paintings remain static.");
function createPaintingLayer(scene, className, label) {
  const button = sceneButtons.find((item) => item.dataset.scene === scene);
  const canvas = document.createElement("canvas");
  canvas.className = `painting-layer ${className}`;
  canvas.width = 0;
  canvas.height = 0;
  canvas.setAttribute("aria-hidden", "true");
  button.insertBefore(canvas, button.querySelector(".scene-hint"));
  const context = canvas.getContext("2d");
  if (!context) console.warn(`${label} effects are unavailable: this browser has no 2D canvas context.`);
  return { button, canvas, context };
}

const sceneLayers = new Map([
  ["botanical", createPaintingLayer("botanical", "bouquet-petals", "Bouquet")],
  ["mountain", createPaintingLayer("mountain", "mountain-birds", "Mountain")],
  ["meadow", createPaintingLayer("meadow", "meadow-seeds", "Meadow")],
  ["rose", createPaintingLayer("rose", "rose-petals", "Rose")],
  ["coast", createPaintingLayer("coast", "coast-waves", "Shoreline")],
  ["fern", createPaintingLayer("fern", "fern-growth", "Fern")],
  ["pond", createPaintingLayer("pond", "pond-waves", "Pond")],
]);
const { button: coastButton, canvas: coastCanvas, context: coastContext } = sceneLayers.get("coast");
const fernAtlas = new Image();
const pondMask = new Image();
const sceneResources = {
  fernAtlas, pondMask,
  fernOriginal: sceneLayers.get("fern").button.querySelector("img"),
};
fernAtlas.addEventListener("load", updateSceneControls);
fernAtlas.addEventListener("error", () => {
  console.warn("Fern source textures could not load; the woodland remains static.");
  updateSceneControls();
});
fernAtlas.src = "art/fern-leaf-atlas.svg?v=20260906-fern-fronds";
pondMask.addEventListener("load", updateSceneControls);
pondMask.addEventListener("error", () => {
  console.warn("Pond water mask could not load; the pond remains static.");
  updateSceneControls();
});
pondMask.src = "art/pond-water-mask.svg?v=20260906-pond-brush-ripples";
const sceneSequences = new Map();
let particles = [];
let particleFrame = null;
let lastPetal = null;
let pointerScrollX = window.scrollX;
let pointerScrollY = window.scrollY;

function clearPaintingLayers() {
  sceneLayers.forEach(({ canvas, context }) => {
    if (context) context.clearRect(0, 0, canvas.width, canvas.height);
  });
}

function clearParticles() {
  if (particleFrame !== null) cancelAnimationFrame(particleFrame);
  particleFrame = null;
  particles = [];
  lastPetal = null;
  if (petalContext) petalContext.clearRect(0, 0, root.clientWidth, window.innerHeight);
  clearPaintingLayers();
}

function clearPointerParticles() {
  particles = particles.filter((particle) => particle.scene);
  lastPetal = null;
  if (petalContext) petalContext.clearRect(0, 0, root.clientWidth, window.innerHeight);
  if (!particles.length && particleFrame !== null) {
    cancelAnimationFrame(particleFrame);
    particleFrame = null;
  }
}

function resizePetalCanvas() {
  clearPointerParticles();
  const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
  petalCanvas.width = Math.round(root.clientWidth * ratio);
  petalCanvas.height = Math.round(window.innerHeight * ratio);
  if (petalContext) petalContext.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function sizePaintingLayer(layer) {
  const style = getComputedStyle(layer.canvas);
  const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
  const width = Math.round(parseFloat(style.width) * ratio);
  const height = Math.round(parseFloat(style.height) * ratio);
  if (layer.canvas.width !== width) layer.canvas.width = width;
  if (layer.canvas.height !== height) layer.canvas.height = height;
  layer.context.setTransform(ratio, 0, 0, ratio, 0, 0);
  return paintingBounds(layer.button.querySelector("img"), true);
}

function drawClickRipple(context, particle, age, dark) {
  const ink = dark ? "#95c7c7" : "#478caa";
  for (let wave = 0; wave < 2; wave += 1) {
    const t = (age - wave * .14) / (wave ? .86 : .84);
    if (t <= 0 || t >= 1) continue;
    const fade = Math.min(1, t / .12) * (1 - t) ** 1.15 * (wave ? .6 : 1);
    const radius = 6 + (wave ? 43 : 52) * t ** .64;
    const wash = context.createLinearGradient(-radius, -radius * .6, radius, radius * .8);
    wash.addColorStop(0, `${ink}00`);
    wash.addColorStop(.22, ink);
    wash.addColorStop(.5, `${ink}60`);
    wash.addColorStop(.78, ink);
    wash.addColorStop(1, `${ink}00`);
    context.fillStyle = wash;
    context.shadowColor = ink;
    context.globalAlpha = fade * .04;
    context.shadowBlur = 4;
    context.beginPath();
    for (const scale of [1.1, .6]) {
      particle.contour.forEach(([x, y], index) => {
        if (index === 0) context.moveTo(x * radius * scale, y * radius * scale);
        else context.lineTo(x * radius * scale, y * radius * scale);
      });
      context.closePath();
    }
    context.fill("evenodd");
    // Tapered, broken pigment edges avoid the appearance of nested bubbles.
    context.globalAlpha = fade * .15;
    context.shadowBlur = 1.8;
    for (const [start, length] of [[0, 19], [31, 19], [60, 8]]) {
      context.beginPath();
      for (let index = 0; index <= length; index += 1) {
        const [x, y] = particle.contour[(start + index + particle.offset + wave * 9) % 72];
        if (index === 0) context.moveTo(x * radius, y * radius);
        else context.lineTo(x * radius, y * radius);
      }
      for (let index = length; index >= 0; index -= 1) {
        const [x, y] = particle.contour[(start + index + particle.offset + wave * 9) % 72];
        const taper = 1 - Math.sin(index / length * Math.PI) * .095;
        context.lineTo(x * radius * taper, y * radius * taper);
      }
      context.closePath();
      context.fill();
    }
    context.shadowBlur = 0;
    context.fillStyle = ink;
    particle.contour.forEach(([x, y, grain], index) => {
      if (index % 2 || grain < .6) return;
      context.globalAlpha = fade * grain * .05;
      context.beginPath();
      context.arc(x * radius * .95, y * radius * .95, .3 + grain * .65, 0, Math.PI * 2);
      context.fill();
    });
  }
}

function drawParticles(now) {
  particleFrame = null;
  petalContext.clearRect(0, 0, root.clientWidth, window.innerHeight);
  clearPaintingLayers();
  particles = particles.filter((particle) => now - particle.born < particle.life);
  const renderSpaces = new Map();
  sceneLayers.forEach((layer, scene) => {
    const sequence = sceneSequences.get(layer.button);
    if (!sequence) return;
    if (!particles.some((particle) => particle.scene === scene)) {
      clearSceneSequence(layer.button);
      return;
    }
    renderSpaces.set(scene, { original: sequence.bounds, current: sizePaintingLayer(layer) });
  });
  const palette = root.dataset.theme === "dark"
    ? ["#e3afae", "#a7cbb4", "#81d6db", "#edd29c"]
    : ["#bb7888", "#688f75", "#388fa9", "#bf975d"];
  particles.forEach((particle) => {
    const age = (now - particle.born) / particle.life;
    if (age < 0) return;
    if (particle.scene) {
      const layer = sceneLayers.get(particle.scene);
      const space = renderSpaces.get(particle.scene);
      if (!space) return;
      const context = layer.context;
      context.save();
      // Keep the original choreography and clock while its painting reflows or scrolls.
      const scale = space.current.width / space.original.width;
      context.translate(space.current.x, space.current.y);
      context.scale(scale, scale);
      context.translate(-space.original.x, -space.original.y);
      sceneRuntime.draw(context, particle, age, root.dataset.theme === "dark", sceneResources);
      context.restore();
      return;
    }
    if (particle.ripple) {
      petalContext.save();
      petalContext.translate(particle.x, particle.y);
      drawClickRipple(petalContext, particle, age, root.dataset.theme === "dark");
      petalContext.restore();
      return;
    }
    petalContext.save();
    petalContext.globalAlpha = (1 - age) * .68;
    petalContext.translate(
      particle.x + particle.vx * age + Math.sin(age * 5 + particle.spin) * 10,
      particle.y + particle.vy * age + age * age * 28
    );
    const color = palette[particle.color];
    petalContext.rotate(particle.spin + age * 2);
    const size = particle.size * (1 - age * .4);
    petalContext.fillStyle = color;
    petalContext.beginPath();
    petalContext.moveTo(-size, 0);
    petalContext.bezierCurveTo(-size, -size, size * .8, -size, size, 0);
    petalContext.bezierCurveTo(size * .5, size * .65, -size * .35, size * .8, -size, 0);
    petalContext.fill();
    petalContext.strokeStyle = root.dataset.theme === "dark" ? "#f0edcf" : "#fbf0dc";
    petalContext.globalAlpha *= .55;
    petalContext.lineWidth = .7;
    petalContext.beginPath();
    petalContext.moveTo(-size * .65, 0);
    petalContext.quadraticCurveTo(0, -size * .15, size * .7, 0);
    petalContext.stroke();
    petalContext.restore();
  });
  if (particles.length) particleFrame = requestAnimationFrame(drawParticles);
}

function scatterPetals(event, burst = false) {
  if (!petalContext || !canUsePointerEffects(event)) return;
  if (particles.some((particle) => particle.scene)) return;
  const now = performance.now();
  if (!burst && lastPetal &&
      (now - lastPetal.time < 24 || Math.hypot(event.clientX - lastPetal.x, event.clientY - lastPetal.y) < 10)) return;
  lastPetal = { x: event.clientX, y: event.clientY, time: now };
  for (let index = 0; index < (burst ? 0 : 2); index += 1) {
    const angle = Math.random() * Math.PI * 2;
    particles.push({
      x: event.clientX, y: event.clientY, born: now,
      life: 950, spin: angle, size: 3 + Math.random() * 4,
      vx: Math.cos(angle) * 15, vy: Math.sin(angle) * 15,
      color: Math.floor(Math.random() * 4), ripple: false,
    });
  }
  if (burst) {
    const activeRipples = particles.filter((particle) => particle.ripple);
    if (activeRipples.length >= 4) particles = particles.filter((particle) => particle !== activeRipples[0]);
    const phase = Math.random() * Math.PI * 2;
    const contour = Array.from({ length: 72 }, (_, index) => {
      const angle = index / 72 * Math.PI * 2;
      const radius = 1 + Math.sin(angle * 3 + phase) * .035 + Math.cos(angle * 7 - phase) * .018;
      return [Math.cos(angle) * radius, Math.sin(angle) * radius * .93, Math.random()];
    });
    particles.push({ x: event.clientX, y: event.clientY, born: now, life: 1150,
      ripple: true, contour, offset: Math.floor(phase / (Math.PI * 2) * 72) });
  }
  // Bound work during rapid movement; there is no animation loop when the trail fades.
  particles = particles.slice(-64);
  if (particleFrame === null) particleFrame = requestAnimationFrame(drawParticles);
}

function clearSceneSequence(button) {
  const sequence = sceneSequences.get(button);
  if (sequence) {
    clearTimeout(sequence.timer);
    sequence.animations.forEach((animation) => animation.cancel());
    sceneSequences.delete(button);
  }
  button.classList.remove("is-playing");
}

function paintingBounds(image, local = false) {
  const style = getComputedStyle(image);
  const box = local
    ? { left: 0, top: 0, width: parseFloat(style.width), height: parseFloat(style.height) }
    : image.getBoundingClientRect();
  const scale = Math.min(box.width / image.naturalWidth, box.height / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  const [alignX, alignY] = style.objectPosition.split(" ").map((value) => parseFloat(value) / 100);
  return { x: box.left + (box.width - width) * alignX, y: box.top + (box.height - height) * alignY, width, height };
}

function playPainting(button, event) {
  if (button.disabled || !effectsEnabled || reducedMotion.matches || document.hidden || !petalContext || !sceneRuntime) {
    updateSceneControls();
    return;
  }
  if (sceneSequences.has(button)) return;
  if (menuButton.getAttribute("aria-expanded") === "true") setMenu(false);
  pointerScrollX = window.scrollX;
  pointerScrollY = window.scrollY;
  const scene = button.dataset.scene;
  const image = button.querySelector("img");
  const layer = sceneLayers.get(scene);
  const bounds = sizePaintingLayer(layer);
  let point = { x: bounds.x + bounds.width * .6, y: bounds.y + bounds.height * .65 };
  if (event.detail > 0) {
    const box = image.getBoundingClientRect();
    const style = getComputedStyle(image);
    point = {
      x: (event.clientX - box.left) * parseFloat(style.width) / box.width,
      y: (event.clientY - box.top) * parseFloat(style.height) / box.height,
    };
  }
  const now = performance.now();
  const additions = sceneRuntime.spawn(scene, bounds, point, now);
  // One sequence per painting bounds all seven to 70 actors; never evict a running scene.
  particles = particles.filter((particle) => particle.scene && particle.scene !== scene).concat(additions);
  lastPetal = null;
  const animations = [];
  const sway = { botanical: 1.2, meadow: .5, rose: .9 }[scene];
  if (sway) {
    [image, layer.canvas].forEach((target) => animations.push(target.animate(
      [{ rotate: "0deg" }, { rotate: `${-sway}deg` }, { rotate: `${sway * .7}deg` }, { rotate: "0deg" }],
      { duration: 1100, easing: "ease-in-out" }
    )));
  }
  if (scene === "botanical") {
    animations.push(button.querySelector(".garden-butterfly").animate(
      [{ translate: "0 0" }, { translate: "-28px -38px" }, { translate: "18px -12px" }, { translate: "0 0" }],
      { duration: 1800, easing: "ease-in-out" }
    ));
  }
  button.classList.add("is-playing");
  const duration = Math.max(...additions.map((particle) => particle.born + particle.life)) - now;
  sceneSequences.set(button, { bounds, animations, timer: setTimeout(() => clearSceneSequence(button), duration) });
  sceneStatus.textContent = language === "zh"
    ? `已触发：${button.dataset.labelZh}` : `Playing: ${button.dataset.labelEn}`;
  if (particleFrame === null) particleFrame = requestAnimationFrame(drawParticles);
}

sceneButtons.forEach((button) => {
  button.addEventListener("click", (event) => playPainting(button, event));
  button.querySelector("img").addEventListener("load", updateSceneControls);
  button.querySelector("img").addEventListener("error", () => {
    console.warn(`Painting could not load: ${button.dataset.scene}`);
    updateSceneControls();
  });
});

function resetPointerEffects() {
  artworks.forEach(resetArtwork);
  clearSpotlights();
  magneticControls.forEach(resetMagnet);
  clearPointerParticles();
}

function resetNatureEffects() {
  resetPointerEffects();
  clearParticles();
  sceneButtons.forEach(clearSceneSequence);
  sceneStatus.textContent = "";
}

function syncNatureEffects() {
  root.dataset.effects = effectsEnabled && !reducedMotion.matches ? "on" : "off";
  resetNatureEffects();
  updateControlLabels();
}

effectsButton.addEventListener("click", () => {
  effectsEnabled = !effectsEnabled;
  sitePreferences.set("effects", effectsEnabled ? "on" : "off");
  syncNatureEffects();
});
document.addEventListener("pointermove", (event) => {
  pointerScrollX = window.scrollX;
  pointerScrollY = window.scrollY;
  scatterPetals(event);
}, { passive: true });
document.addEventListener("click", (event) => {
  const onPainting = event.target instanceof Element && event.target.closest(".scene-art");
  if (event.button === 0 && event.detail > 0 && !onPainting) scatterPetals(event, true);
});
document.addEventListener("pointerout", (event) => {
  if (event.pointerType === "mouse" && !event.relatedTarget) resetPointerEffects();
});
document.addEventListener("pointercancel", resetPointerEffects);
document.addEventListener("visibilitychange", resetNatureEffects);
window.addEventListener("blur", resetNatureEffects);
window.addEventListener("beforeprint", resetNatureEffects);
window.addEventListener("scroll", () => {
  // A pointer event may already have sampled the new viewport before scroll is delivered.
  if (window.scrollX !== pointerScrollX || window.scrollY !== pointerScrollY) resetPointerEffects();
  pointerScrollX = window.scrollX;
  pointerScrollY = window.scrollY;
}, { passive: true });
window.addEventListener("resize", () => {
  resetPointerEffects();
  resizePetalCanvas();
}, { passive: true });
reducedMotion.addEventListener("change", syncNatureEffects);
finePointer.addEventListener("change", resetPointerEffects);
resizePetalCanvas();
syncNatureEffects();

applyLanguage(language);
setTheme(root.dataset.theme);
root.dataset.enhanced = "";
document.getElementById("year").textContent = new Date().getFullYear();
