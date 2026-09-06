const root = document.documentElement;
const languageButton = document.querySelector(".lang-toggle");
const themeButton = document.querySelector(".theme-toggle");
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

function updateControlLabels() {
  const chinese = language === "zh";
  const dark = root.dataset.theme === "dark";
  const menuOpen = menuButton.getAttribute("aria-expanded") === "true";
  themeButton.setAttribute("aria-label", chinese
    ? `切换到${dark ? "浅色" : "深色"}主题`
    : `Switch to ${dark ? "light" : "dark"} theme`);
  languageButton.setAttribute("aria-label", chinese ? "Switch to English" : "切换到中文");
  menuButton.setAttribute("aria-label", chinese
    ? `${menuOpen ? "关闭" : "打开"}导航`
    : `${menuOpen ? "Close" : "Open"} navigation`);
  navigation.setAttribute("aria-label", chinese ? "主导航" : "Primary navigation");
  document.querySelector(".project-filters").setAttribute("aria-label", chinese ? "筛选项目" : "Filter projects");
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
  languageButton.firstElementChild.textContent = language === "zh" ? "中文" : "EN";
  languageButton.lastElementChild.textContent = language === "zh" ? "/ EN" : "/ 中文";
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
  const theme = root.dataset.theme === "dark" ? "light" : "dark";
  sitePreferences.set("theme", theme);
  setTheme(theme);
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

const artwork = document.querySelector(".hero");
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
let paintFrame = null;

function resetPaint() {
  if (paintFrame !== null) cancelAnimationFrame(paintFrame);
  paintFrame = null;
  artwork.style.removeProperty("--paint-x");
  artwork.style.removeProperty("--paint-y");
}

artwork.addEventListener("pointermove", (event) => {
  if (reducedMotion.matches || !finePointer.matches || event.pointerType !== "mouse") return;
  if (paintFrame !== null) cancelAnimationFrame(paintFrame);
  paintFrame = requestAnimationFrame(() => {
    paintFrame = null;
    const bounds = artwork.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 12;
    const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 12;
    artwork.style.setProperty("--paint-x", `${x.toFixed(2)}px`);
    artwork.style.setProperty("--paint-y", `${y.toFixed(2)}px`);
  });
});
artwork.addEventListener("pointerleave", resetPaint);
reducedMotion.addEventListener("change", resetPaint);
finePointer.addEventListener("change", resetPaint);

const spotlightCards = [...document.querySelectorAll(".project-card, .repo-logo-card, .social-card")];
const spotlightFrames = new Map();

function clearSpotlight(card) {
  const frame = spotlightFrames.get(card);
  if (frame !== undefined) cancelAnimationFrame(frame);
  spotlightFrames.delete(card);
  card.classList.remove("pointer-lit");
}

spotlightCards.forEach((card) => {
  card.addEventListener("pointermove", (event) => {
    if (reducedMotion.matches || !finePointer.matches || event.pointerType !== "mouse") return;
    const frame = spotlightFrames.get(card);
    if (frame !== undefined) cancelAnimationFrame(frame);
    spotlightFrames.set(card, requestAnimationFrame(() => {
      spotlightFrames.delete(card);
      const bounds = card.getBoundingClientRect();
      card.style.setProperty("--spot-x", `${event.clientX - bounds.left}px`);
      card.style.setProperty("--spot-y", `${event.clientY - bounds.top}px`);
      card.classList.add("pointer-lit");
    }));
  });
  card.addEventListener("pointerleave", () => clearSpotlight(card));
});

function clearSpotlights() {
  spotlightCards.forEach(clearSpotlight);
}
reducedMotion.addEventListener("change", clearSpotlights);
finePointer.addEventListener("change", clearSpotlights);

applyLanguage(language);
setTheme(root.dataset.theme);
root.dataset.enhanced = "";
document.getElementById("year").textContent = new Date().getFullYear();
