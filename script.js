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

  document.documentElement.classList.add("language-fading");
  window.setTimeout(() => {
    applyLanguage(nextLanguage);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.documentElement.classList.remove("language-fading");
      });
    });
  }, 160);
  window.setTimeout(() => {
    languageTransitioning = false;
    languageButton.disabled = false;
  }, 400);
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
  const cursorIdleDelay = 2000;
  let cursorIdleTimer = null;
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
    document.body.classList.remove("cursor-idle");
    window.clearTimeout(cursorIdleTimer);
    cursorIdleTimer = window.setTimeout(() => {
      document.body.classList.add("cursor-idle");
    }, cursorIdleDelay);

    if (!tracking) {
      currentX = targetX;
      currentY = targetY;
      tracking = true;
      document.body.classList.add("cursor-active");
      requestAnimationFrame(followPointer);
    }
  });

  document.documentElement.addEventListener("mouseleave", () => {
    window.clearTimeout(cursorIdleTimer);
    tracking = false;
    document.body.classList.remove("cursor-active");
    document.body.classList.remove("cursor-idle");
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

  const pointerSections = [
    ...document.querySelectorAll("main > .section, main > .contact-section"),
  ];
  const sectionPointerControllers = new Map();
  let lastMouseX = null;
  let lastMouseY = null;
  let scrollSyncFrame = null;

  pointerSections.forEach((section) => {
    let currentSlowX = 0;
    let currentSlowY = 0;
    let targetSlowX = 0;
    let targetSlowY = 0;
    let sectionPointerFrame = null;
    let sectionPointerInitialized = false;

    function followSectionPointer() {
      currentSlowX += (targetSlowX - currentSlowX) * 0.07;
      currentSlowY += (targetSlowY - currentSlowY) * 0.07;
      section.style.setProperty("--section-pointer-slow-x", `${currentSlowX.toFixed(2)}px`);
      section.style.setProperty("--section-pointer-slow-y", `${currentSlowY.toFixed(2)}px`);

      if (
        Math.abs(targetSlowX - currentSlowX) < 0.1 &&
        Math.abs(targetSlowY - currentSlowY) < 0.1
      ) {
        sectionPointerFrame = null;
        return;
      }

      sectionPointerFrame = requestAnimationFrame(followSectionPointer);
    }

    function updateSectionPointer(clientX, clientY) {
      const bounds = section.getBoundingClientRect();
      const pointerX = clientX - bounds.left;
      const pointerY = clientY - bounds.top;
      section.style.setProperty("--section-pointer-x", `${pointerX}px`);
      section.style.setProperty("--section-pointer-y", `${pointerY}px`);
      targetSlowX = pointerX;
      targetSlowY = pointerY;

      if (!sectionPointerInitialized) {
        currentSlowX = pointerX;
        currentSlowY = pointerY;
        sectionPointerInitialized = true;
      }

      if (sectionPointerFrame === null) {
        sectionPointerFrame = requestAnimationFrame(followSectionPointer);
      }

      section.classList.add("pointer-lit");
    }

    function deactivateSectionPointer() {
      if (sectionPointerFrame !== null) {
        cancelAnimationFrame(sectionPointerFrame);
        sectionPointerFrame = null;
      }
      sectionPointerInitialized = false;
      section.classList.remove("pointer-lit");
    }

    sectionPointerControllers.set(section, {
      deactivate: deactivateSectionPointer,
      update: updateSectionPointer,
    });

    section.addEventListener("pointermove", (event) => {
      if (event.pointerType && event.pointerType !== "mouse") {
        return;
      }
      updateSectionPointer(event.clientX, event.clientY);
    });

    section.addEventListener("pointerleave", deactivateSectionPointer);
  });

  window.addEventListener("pointermove", (event) => {
    if (event.pointerType && event.pointerType !== "mouse") {
      return;
    }
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
  });

  window.addEventListener(
    "scroll",
    () => {
      if (scrollSyncFrame !== null || lastMouseX === null || lastMouseY === null) {
        return;
      }

      scrollSyncFrame = requestAnimationFrame(() => {
        scrollSyncFrame = null;
        const elementAtPointer = document.elementFromPoint(lastMouseX, lastMouseY);
        const activeSection = elementAtPointer?.closest("main > .section, main > .contact-section");

        sectionPointerControllers.forEach((controller, section) => {
          if (section === activeSection) {
            controller.update(lastMouseX, lastMouseY);
          } else if (section.classList.contains("pointer-lit")) {
            controller.deactivate();
          }
        });
      });
    },
    { passive: true }
  );

  document.documentElement.addEventListener("mouseleave", () => {
    lastMouseX = null;
    lastMouseY = null;
    sectionPointerControllers.forEach((controller) => controller.deactivate());
  });
}

document.getElementById("year").textContent = new Date().getFullYear();
