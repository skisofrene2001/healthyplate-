// UI Preferences — stored in localStorage
const KEY = 'hp_ui_prefs';

const DEFAULTS = {
  showBudget: true,
  showScanImage: true,
  showAntiGaspi: true,
  showInspiration: true,
  showDiet: true,
  showCalories: true,
  calorieTarget: 2000,
  useCalorieTarget: false,
  enableCaching: true,
};

export function getUiPrefs() {
  try {
    const saved = localStorage.getItem(KEY);
    return saved ? { ...DEFAULTS, ...JSON.parse(saved) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveUiPrefs(prefs) {
  localStorage.setItem(KEY, JSON.stringify(prefs));
}

export { DEFAULTS };
