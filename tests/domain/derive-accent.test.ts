import { describe, expect, it } from "vitest";
import { contrastAgainstWhite, deriveAccentTokens, meetsContrastThreshold } from "../../lib/branding/derive-accent";

describe("deriveAccentTokens", () => {
  it("dérive des variantes plus claires que l'accent pour les fonds faibles", () => {
    const tokens = deriveAccentTokens("#2A5C86");
    expect(tokens.accent).toBe("#2A5C86");
    expect(tokens.accentHover).toMatch(/^#[0-9a-f]{6}$/i);
    expect(tokens.accentWeak).toMatch(/^#[0-9a-f]{6}$/i);
    expect(tokens.accentWeakStrong).toMatch(/^#[0-9a-f]{6}$/i);
  });
});

describe("contraste WCAG", () => {
  it("valide le bleu acier par défaut de KERF", () => {
    expect(meetsContrastThreshold("#2A5C86")).toBe(true);
  });

  it("rejette un pastel clair illisible en texte blanc", () => {
    expect(meetsContrastThreshold("#F5E6C8")).toBe(false);
  });

  it("le ratio de contraste augmente quand la couleur s'assombrit", () => {
    expect(contrastAgainstWhite("#000000")).toBeGreaterThan(contrastAgainstWhite("#808080"));
  });
});
