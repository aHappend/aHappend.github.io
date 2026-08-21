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

function setLanguage(language) {
  document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  languageLabel.textContent = language === "zh" ? "中文" : "EN";
  languageButton.lastElementChild.textContent = language === "zh" ? "/ EN" : "/ 中文";

  translatableElements.forEach((element) => {
    element.textContent = element.dataset[language];
  });

  localStorage.setItem("language", language);
}

languageButton.addEventListener("click", () => {
  setLanguage(document.documentElement.lang.startsWith("zh") ? "en" : "zh");
});

const storedLanguage = localStorage.getItem("language");
setLanguage(storedLanguage || "en");

const filters = document.querySelectorAll(".filter");
const projectCards = document.querySelectorAll(".project-card");

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
      } else {
        entry.target.classList.remove("visible");
      }
    });
  },
  { threshold: 0.12 }
);

document.querySelectorAll(".reveal").forEach((element, index) => {
  element.style.transitionDelay = `${Math.min(index % 4, 3) * 70}ms`;
  observer.observe(element);
});

const cursorGlow = document.querySelector(".cursor-glow");
const finePointer = window.matchMedia("(pointer: fine)").matches;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
}

document.getElementById("year").textContent = new Date().getFullYear();
