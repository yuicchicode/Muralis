const THEME_STORAGE_KEY = "muralis_theme";
const THEME_VALUES = new Set(["light", "dark", "system"]);
const systemThemeQuery = window.matchMedia("(prefers-color-scheme: dark)");

let currentPreference = "system";

function normalizeThemePreference(theme) {
  return THEME_VALUES.has(theme) ? theme : "system";
}

function getSystemTheme() {
  return systemThemeQuery.matches ? "dark" : "light";
}

function getResolvedTheme(preference = currentPreference) {
  return preference === "system" ? getSystemTheme() : preference;
}

function applyThemePreference(preference) {
  const nextPreference = normalizeThemePreference(preference);
  const resolvedTheme = getResolvedTheme(nextPreference);

  currentPreference = nextPreference;

  document.documentElement.dataset.theme = resolvedTheme;
  document.documentElement.dataset.themePreference = nextPreference;

  window.dispatchEvent(
    new CustomEvent("muralis:themechange", {
      detail: {
        preference: nextPreference,
        theme: resolvedTheme,
      },
    })
  );
}

export function getThemePreference() {
  return currentPreference;
}

export function setThemePreference(theme) {
  const nextPreference = normalizeThemePreference(theme);

  try {
    localStorage.setItem(THEME_STORAGE_KEY, nextPreference);
  } catch (error) {
    console.warn("Nao foi possivel salvar o tema do Muralis.", error);
  }

  applyThemePreference(nextPreference);
}

export function toggleTheme() {
  const resolvedTheme = getResolvedTheme();
  const nextTheme = resolvedTheme === "dark" ? "light" : "dark";

  setThemePreference(nextTheme);
}

export function initTheme() {
  try {
    currentPreference = normalizeThemePreference(
      localStorage.getItem(THEME_STORAGE_KEY)
    );
  } catch (error) {
    console.warn("Nao foi possivel carregar o tema do Muralis.", error);
    currentPreference = "system";
  }

  applyThemePreference(currentPreference);

  const handleSystemThemeChange = () => {
    if (currentPreference === "system") {
      applyThemePreference(currentPreference);
    }
  };

  if (typeof systemThemeQuery.addEventListener === "function") {
    systemThemeQuery.addEventListener("change", handleSystemThemeChange);
  } else {
    systemThemeQuery.addListener(handleSystemThemeChange);
  }
}
