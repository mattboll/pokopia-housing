/** Environment palette shared by tiles, headings and chips. */
export const ENVIRONMENTS = ['Lumineux', 'Sombre', 'Chaud', 'Frais', 'Humide', 'Sec'];

export const ENV_COLORS = {
  Lumineux: { main: '#FFD036', light: '#FFF3C4', dark: '#B8960A' },
  Sombre: { main: '#7B2FF2', light: '#D8C2FC', dark: '#4A1A8A' },
  Chaud: { main: '#FF6B35', light: '#FFDAC6', dark: '#C44A1A' },
  Frais: { main: '#00C9DB', light: '#B8F4FA', dark: '#0097A7' },
  Humide: { main: '#2E86DE', light: '#BFD9F7', dark: '#1A5DAA' },
  Sec: { main: '#D4915E', light: '#F0DBC8', dark: '#8B5E3C' },
};

const FALLBACK = { main: '#95a5a6', light: '#e8ecec', dark: '#5d6d6d' };

/** @param {string} env */
export function envColor(env) {
  return ENV_COLORS[env] || FALLBACK;
}
