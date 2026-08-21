const languageButton = document.querySelector(".lang-toggle");
const languageLabel = languageButton.querySelector(".lang-active");
const translatableElements = document.querySelectorAll("[data-en][data-zh]");
const themeButton = document.querySelector(".theme-toggle");

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const nextTheme = theme === "dark" ? "light" : "dark";
  themeButton.setAttribute("aria-label", `Switch to ${nextTheme} theme`);
  localStorage.setItem("theme", theme);
}

const storedTheme = localStorage.getItem("theme");
const preferredTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
setTheme(storedTheme || preferredTheme);

themeButton.addEventListener("click", () => {
  setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
});

function applyLanguage(language) {
  document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  languageLabel.textContent = language === "zh" ? "中文" : "EN";
  languageButton.lastElementChild.textContent = language === "zh" ? "/ EN" : "/ 中文";

  translatableElements.forEach((element) => {
    element.textContent = element.dataset[language];
  });

  localStorage.setItem("language", language);
}

const storedLanguage = localStorage.getItem("language");
applyLanguage(storedLanguage || "en");

let languageTransitioning = false;

languageButton.addEventListener("click", () => {
  if (languageTransitioning) {
    return;
  }

  languageTransitioning = true;
  languageButton.disabled = true;
  const nextLanguage = document.documentElement.lang.startsWith("zh") ? "en" : "zh";
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (prefersReducedMotion) {
    applyLanguage(nextLanguage);
    languageTransitioning = false;
    languageButton.disabled = false;
    return;
  }

  if (document.startViewTransition) {
    const transition = document.startViewTransition(() => applyLanguage(nextLanguage));
    transition.finished.finally(() => {
      languageTransitioning = false;
      languageButton.disabled = false;
    });
    return;
  }

  document.documentElement.classList.add("language-fading");
  window.setTimeout(() => {
    applyLanguage(nextLanguage);
    requestAnimationFrame(() => {
      document.documentElement.classList.remove("language-fading");
    });
  }, 150);
  window.setTimeout(() => {
    languageTransitioning = false;
    languageButton.disabled = false;
  }, 360);
});

const filters = document.querySelectorAll(".filter");
const projectCards = document.querySelectorAll(".project-card");
const mobileMotion = window.matchMedia("(pointer: coarse)").matches || window.innerWidth <= 680;

filters.forEach((filter) => {
  filter.addEventListener("click", () => {
    filters.forEach((item) => item.classList.remove("active"));
    filter.classList.add("active");

    const selected = filter.dataset.filter;
    projectCards.forEach((card) => {
      const categories = card.dataset.category.split(" ");
      card.classList.toggle("is-hidden", selected !== "all" && !categories.includes(selected));
    });
  });
});

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        if (mobileMotion) {
          observer.unobserve(entry.target);
        }
      } else if (!mobileMotion) {
        entry.target.classList.remove("visible");
      }
    });
  },
  { threshold: 0.12 }
);

const revealElements = [...document.querySelectorAll(".reveal")];
const revealGroups = new Map();

revealElements.forEach((element) => {
  const group =
    element.closest(".hero, .project-grid, .ecosystem-section, .publication-list, .about-section, .social-grid") ||
    element.parentElement;
  const groupElements = revealGroups.get(group) || [];
  groupElements.push(element);
  revealGroups.set(group, groupElements);
});

revealGroups.forEach((elements) => {
  elements.forEach((element, index) => {
    const delay = mobileMotion ? Math.min(index, 4) * 45 : index * 90;
    element.style.setProperty("--reveal-delay", `${delay}ms`);
  });
});

revealElements.forEach((element) => {
  observer.observe(element);
});

const cursorGlow = document.querySelector(".cursor-glow");
const finePointer = window.matchMedia("(pointer: fine)").matches;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const hero = document.querySelector(".hero");
const heroWatercolor = document.querySelector(".hero-watercolor");

if (!reducedMotion) {
  const heroMotionObserver = new IntersectionObserver(
    ([entry]) => {
      hero.classList.toggle("watercolor-paused", entry.intersectionRatio === 0);
    },
    { threshold: 0 }
  );
  heroMotionObserver.observe(hero);
}

if (finePointer && !reducedMotion) {
  let currentX = 0;
  let currentY = 0;
  let targetX = 0;
  let targetY = 0;
  let tracking = false;

  function followPointer() {
    currentX += (targetX - currentX) * 0.14;
    currentY += (targetY - currentY) * 0.14;
    cursorGlow.style.transform = `translate3d(${currentX - 140}px, ${currentY - 140}px, 0)`;

    if (tracking) {
      requestAnimationFrame(followPointer);
    }
  }

  window.addEventListener("pointermove", (event) => {
    targetX = event.clientX;
    targetY = event.clientY;

    if (!tracking) {
      currentX = targetX;
      currentY = targetY;
      tracking = true;
      document.body.classList.add("cursor-active");
      requestAnimationFrame(followPointer);
    }
  });

  document.documentElement.addEventListener("mouseleave", () => {
    tracking = false;
    document.body.classList.remove("cursor-active");
  });

  hero.addEventListener("pointermove", (event) => {
    const bounds = hero.getBoundingClientRect();
    const offsetX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 14;
    const offsetY = ((event.clientY - bounds.top) / bounds.height - 0.5) * 10;
    heroWatercolor.style.setProperty("--hero-paint-x", `${offsetX.toFixed(2)}px`);
    heroWatercolor.style.setProperty("--hero-paint-y", `${offsetY.toFixed(2)}px`);
  });

  hero.addEventListener("pointerleave", () => {
    heroWatercolor.style.setProperty("--hero-paint-x", "0px");
    heroWatercolor.style.setProperty("--hero-paint-y", "0px");
  });
}

if (!reducedMotion) {
  document
    .querySelectorAll(".project-card, .repo-logo-card, .social-card")
    .forEach((card) => {
      card.addEventListener("pointermove", (event) => {
        if (event.pointerType && event.pointerType !== "mouse") {
          return;
        }
        const bounds = card.getBoundingClientRect();
        const x = event.clientX - bounds.left;
        const y = event.clientY - bounds.top;
        const rotateX = ((y / bounds.height) - 0.5) * -4;
        const rotateY = ((x / bounds.width) - 0.5) * 5;

        card.style.setProperty("--card-pointer-x", `${x}px`);
        card.style.setProperty("--card-pointer-y", `${y}px`);
        card.style.setProperty("--card-rotate-x", `${rotateX.toFixed(2)}deg`);
        card.style.setProperty("--card-rotate-y", `${rotateY.toFixed(2)}deg`);
        card.classList.add("pointer-card-active");
      });

      card.addEventListener("pointerleave", () => {
        card.classList.remove("pointer-card-active");
        card.style.removeProperty("--card-rotate-x");
        card.style.removeProperty("--card-rotate-y");
      });
    });

  document
    .querySelectorAll("main > .section, main > .contact-section")
    .forEach((section) => {
      section.addEventListener("pointermove", (event) => {
        if (event.pointerType && event.pointerType !== "mouse") {
          return;
        }
        const bounds = section.getBoundingClientRect();
        section.style.setProperty("--section-pointer-x", `${event.clientX - bounds.left}px`);
        section.style.setProperty("--section-pointer-y", `${event.clientY - bounds.top}px`);
        section.classList.add("pointer-lit");
      });

      section.addEventListener("pointerleave", () => {
        section.classList.remove("pointer-lit");
      });
    });
}

document.getElementById("year").textContent = new Date().getFullYear();
