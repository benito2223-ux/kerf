import { describe, expect, it } from "vitest";
import {
  applyGlobalDiscount,
  isDiscountAllowed,
  lineTotal,
  quoteSubtotal,
  totalWithTax,
} from "../../lib/domain/pricing";

describe("lineTotal", () => {
  it("applique la remise de ligne à quantité × prix unitaire", () => {
    expect(lineTotal({ quantity: 10, unitPrice: 18.9, discountPct: 12 })).toBeCloseTo(166.32, 2);
  });

  it("rejette une remise hors de [0, 100]", () => {
    expect(() => lineTotal({ quantity: 1, unitPrice: 10, discountPct: -1 })).toThrow();
    expect(() => lineTotal({ quantity: 1, unitPrice: 10, discountPct: 101 })).toThrow();
  });
});

describe("quoteSubtotal", () => {
  it("additionne les lignes déjà remisées", () => {
    const lines = [
      { quantity: 2, unitPrice: 100, discountPct: 0 },
      { quantity: 1, unitPrice: 50, discountPct: 10 },
    ];
    expect(quoteSubtotal(lines)).toBeCloseTo(245, 2);
  });
});

describe("applyGlobalDiscount et totalWithTax", () => {
  it("enchaîne remise globale puis TVA sans dérive d'arrondi", () => {
    const afterDiscount = applyGlobalDiscount(1000, 5);
    expect(afterDiscount).toBeCloseTo(950, 2);
    expect(totalWithTax(afterDiscount, 20)).toBeCloseTo(1140, 2);
  });
});

describe("isDiscountAllowed", () => {
  it("bloque une remise commerciale au-delà du plafond du rôle", () => {
    expect(isDiscountAllowed(15, 20)).toBe(true);
    expect(isDiscountAllowed(25, 20)).toBe(false);
  });
});
