// Run before the stylesheet to avoid flashing the wrong theme.
const sitePreferences = (() => {
  const memory = new Map();
  const allowed = { theme: ["light", "dark"], language: ["en", "zh"] };

  function storageUnavailable(error) {
    if (!(error instanceof DOMException) ||
        !["SecurityError", "QuotaExceededError"].includes(error.name)) {
      throw error;
    }
    console.warn("Site preferences cannot be saved in this browser; using this page's settings.", error.name);
  }

  return {
    get(key) {
      if (memory.has(key)) return memory.get(key);
      let value = null;
      try {
        value = localStorage.getItem(key);
      } catch (error) {
        storageUnavailable(error);
      }
      const validValue = allowed[key]?.includes(value) ? value : null;
      memory.set(key, validValue);
      return validValue;
    },
    set(key, value) {
      if (!allowed[key]?.includes(value)) throw new TypeError(`Invalid site preference: ${key}`);
      memory.set(key, value);
      try {
        localStorage.setItem(key, value);
      } catch (error) {
        storageUnavailable(error);
      }
    },
  };
})();

document.documentElement.dataset.theme = sitePreferences.get("theme") ||
  (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
