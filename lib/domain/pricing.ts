/**
 * Calculs de tarification (ARCHITECTURE.md §4.4). Code pur, testé — un
 * devis émis fige ces montants à la ligne, jamais recalculés plus tard.
 */

export interface QuoteLineInput {
  quantity: number;
  unitPrice: number;
  discountPct: number;
}

export function lineTotal({ quantity, unitPrice, discountPct }: QuoteLineInput): number {
  if (discountPct < 0 || discountPct > 100) throw new Error("discountPct doit être entre 0 et 100");
  return round2(quantity * unitPrice * (1 - discountPct / 100));
}

export function quoteSubtotal(lines: QuoteLineInput[]): number {
  return round2(lines.reduce((sum, line) => sum + lineTotal(line), 0));
}

export function applyGlobalDiscount(subtotal: number, globalDiscountPct: number): number {
  if (globalDiscountPct < 0 || globalDiscountPct > 100) throw new Error("globalDiscountPct doit être entre 0 et 100");
  return round2(subtotal * (1 - globalDiscountPct / 100));
}

export function totalWithTax(subtotalAfterDiscount: number, taxRatePct: number): number {
  return round2(subtotalAfterDiscount * (1 + taxRatePct / 100));
}

/**
 * Un commercial ne peut jamais dépasser le plafond de remise fixé par son
 * admin (ARCHITECTURE.md §3.2). Vérification côté serveur, jamais côté UI seule.
 */
export function isDiscountAllowed(discountPct: number, maxDiscountPct: number): boolean {
  return discountPct <= maxDiscountPct;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
