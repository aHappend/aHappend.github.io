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
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 }
);

document.querySelectorAll(".reveal").forEach((element, index) => {
  element.style.transitionDelay = `${Math.min(index % 4, 3) * 70}ms`;
  observer.observe(element);
});

document.getElementById("year").textContent = new Date().getFullYear();
