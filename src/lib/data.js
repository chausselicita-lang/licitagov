export const STORAGE_KEY = "licitagov_data_v2";

export function loadData() {
  try {
    const r = localStorage.getItem(STORAGE_KEY);
    if (r) return JSON.parse(r);
  } catch {}
  return null;
}

export function saveData(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

export const SEED = {
  processos: [], atas: [], contratos: [], cotacoes: [], dispensas: [], inexigibilidades: [],
};
