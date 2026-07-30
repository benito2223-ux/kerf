/**
 * Dérive les variantes d'une couleur d'accent tenant à partir d'une seule
 * valeur hex (ARCHITECTURE.md §3.6). Un client ne saisit qu'une couleur ;
 * le reste est calculé pour garantir une palette cohérente.
 */

export interface AccentTokens {
  accent: string;
  accentHover: string;
  accentWeak: string;
  accentWeakStrong: string;
}

export function deriveAccentTokens(hex: string): AccentTokens {
  const { h, s, l } = hexToHsl(hex);
  return {
    accent: hex,
    accentHover: hslToHex(h, s, clamp(l - 10)),
    accentWeak: hslToHex(h, Math.min(s, 45), clamp(96)),
    accentWeakStrong: hslToHex(h, Math.min(s, 45), clamp(88)),
  };
}

/**
 * Contraste WCAG entre la couleur d'accent et le blanc utilisé comme texte
 * des boutons primaires. Seuil AA pour texte "large"/gras : 3.0.
 */
export function contrastAgainstWhite(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const luminance = relativeLuminance(r, g, b);
  return (1 + 0.05) / (luminance + 0.05);
}

export function meetsContrastThreshold(hex: string, threshold = 3.0): boolean {
  return contrastAgainstWhite(hex) >= threshold;
}

// ---------------------------------------------------------------------------

function clamp(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return { r, g, b };
}

function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs! + 0.7152 * gs! + 0.0722 * bs!;
}

function hexToHsl(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;

  if (max === min) return { h: 0, s: 0, l: l * 100 };

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  switch (max) {
    case rn:
      h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
      break;
    case gn:
      h = ((bn - rn) / d + 2) * 60;
      break;
    default:
      h = ((rn - gn) / d + 4) * 60;
  }
  return { h, s: s * 100, l: l * 100 };
}

function hslToHex(h: number, s: number, l: number): string {
  const sn = s / 100;
  const ln = l / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ln - c / 2;

  let [r, g, b] = [0, 0, 0];
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
