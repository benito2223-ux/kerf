"use client";

import { useState } from "react";

interface Props {
  tenantSlug: string;
  accountId: string;
  accountName: string;
}

export function NewQuotePage({ tenantSlug, accountId, accountName }: Props) {
  const [quoteLines, setQuoteLines] = useState<
    Array<{
      id: string;
      productId: string;
      productName: string;
      sku: string;
      description: string;
      quantity: number;
      unit: string;
      unitPrice: number;
      discountPct: number;
      lineTotal: number;
    }>
  >([]);
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [terms, setTerms] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"brouillon" | "envoye" | "accepte" | "refuse" | "expire">("brouillon");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function updateLine(
    id: string,
    field: keyof (typeof quoteLines)[number],
    value: string | number,
  ) {
    setQuoteLines((prev) =>
      prev.map((line) => {
        if (line.id !== id) return line;
        const updated = { ...line, [field]: value };
        // Recalculate line total
        if (field === "unitPrice" || field === "quantity" || field === "discountPct") {
          const price = typeof updated.unitPrice === "number" ? updated.unitPrice : Number(updated.unitPrice);
          const qty = typeof updated.quantity === "number" ? updated.quantity : Number(updated.quantity);
          const disc = typeof updated.discountPct === "number" ? updated.discountPct : Number(updated.discountPct);
          updated.lineTotal = Math.round(price * qty * (1 - disc / 100) * 10000) / 10000;
        }
        return updated;
      }),
    );
  }

  function addLine() {
    setQuoteLines((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        productId: "",
        productName: "",
        sku: "",
        description: "",
        quantity: 1,
        unit: "pièce",
        unitPrice: 0,
        discountPct: 0,
        lineTotal: 0,
      },
    ]);
  }

  function removeLine(id: string) {
    setQuoteLines((prev) => prev.filter((l) => l.id !== id));
  }

  function subtotal() {
    return quoteLines.reduce((sum, l) => sum + l.lineTotal, 0);
  }

  function total() {
    return Math.round((subtotal() * (1 - globalDiscount / 100)) * 10000) / 10000;
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/${tenantSlug}/devis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          contactId: null,
          dealId: null,
          status,
          currency: "EUR",
          validUntil: validUntil || null,
          globalDiscountPct: globalDiscount,
          notes,
          terms,
          lines: quoteLines.map((l) => ({
            productId: l.productId || null,
            description: l.description,
            quantity: l.quantity,
            unit: l.unit,
            unitPrice: l.unitPrice,
            discountPct: l.discountPct,
            lineTotal: l.lineTotal,
          })),
        }),
      });
      if (!res.ok) throw new Error("Erreur lors de la sauvegarde");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main style={{ padding: 32, maxWidth: 800 }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
        Nouveau devis pour {accountName}
      </h1>

      {saved && (
        <div style={{ padding: 10, borderRadius: "var(--radius)", background: "var(--success-weak)", border: "1px solid var(--success)", fontSize: 12.5, marginBottom: 14, color: "var(--success)" }}>
          Devis sauvegardé ✓
        </div>
      )}

      {/* Lignes */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
        {quoteLines.map((line, idx) => (
          <div
            key={line.id}
            style={{
              display: "flex",
              gap: 8,
              alignItems: "flex-start",
              padding: 10,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
            }}
          >
            <span style={{ fontSize: 11, color: "var(--faint)", paddingTop: 6, width: 20, textAlign: "right" }}>
              {idx + 1}
            </span>
            <div style={{ flex: 1 }}>
              <input
                type="text"
                placeholder="Description"
                value={line.description}
                onChange={(e) => updateLine(line.id, "description", e.target.value)}
                style={{ ...inputStyle, width: "100%", marginBottom: 4 }}
              />
              <div style={{ display: "flex", gap: 6, fontSize: 11.5 }}>
                <input
                  type="text"
                  placeholder="SKU"
                  value={line.sku}
                  onChange={(e) => updateLine(line.id, "sku", e.target.value)}
                  style={{ ...inputStyle, width: 100 }}
                  className="num-mono"
                />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Prix HT"
                  value={line.unitPrice || ""}
                  onChange={(e) => updateLine(line.id, "unitPrice", Number(e.target.value))}
                  style={{ ...inputStyle, width: 80, textAlign: "right" }}
                  className="num-mono"
                />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Qté"
                  value={line.quantity || ""}
                  onChange={(e) => updateLine(line.id, "quantity", Number(e.target.value))}
                  style={{ ...inputStyle, width: 60, textAlign: "right" }}
                  className="num-mono"
                />
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  placeholder="Remise %"
                  value={line.discountPct || ""}
                  onChange={(e) => updateLine(line.id, "discountPct", Number(e.target.value))}
                  style={{ ...inputStyle, width: 60, textAlign: "right" }}
                  className="num-mono"
                />
              </div>
            </div>
            <div style={{ textAlign: "right", minWidth: 80 }}>
              <div className="num-mono" style={{ fontWeight: 700, fontSize: 13, color: "var(--accent)" }}>
                {line.lineTotal.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
              </div>
              <button
                type="button"
                onClick={() => removeLine(line.id)}
                style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", fontSize: 11, padding: "2px 4px" }}
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      <button type="button" onClick={addLine} style={{ ...buttonStyle, marginBottom: 18 }}>
        + Ajouter une ligne
      </button>

      {/* Récapitulatif */}
      <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 14, background: "var(--surface)", marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 6 }}>
          <span style={{ color: "var(--muted)" }}>Sous-total</span>
          <span className="num-mono" style={{ fontWeight: 600 }}>{subtotal().toLocaleString("fr-FR", { minimumFractionDigits: 2 })}$</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 6 }}>
          <span style={{ color: "var(--muted)" }}>Remise globale</span>
          <span style={{ color: "var(--warn)" }}>{globalDiscount}%</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, borderTop: "1px solid var(--border)", paddingTop: 6, marginTop: 4 }}>
          <strong>Total HT</strong>
          <strong className="num-mono" style={{ color: "var(--accent)" }}>
            {total().toLocaleString("fr-FR", { minimumFractionDigits: 2 })}$
          </strong>
        </div>
        {/* TVA 20% estimate */}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
          <span>TVA (20%)</span>
          <span className="num-mono">{(total() * 0.2).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</span>
        </div>
      </div>

      {/* Options */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18, fontSize: 12.5 }}>
        <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
          Remise globale (%)
          <input
            type="number"
            step="0.5"
            min="0"
            max="100"
            value={globalDiscount || ""}
            onChange={(e) => setGlobalDiscount(Number(e.target.value))}
            style={{ ...inputStyle, width: 80, textAlign: "right" }}
            className="num-mono"
          />
        </label>
        <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
          Valable jusqu'au
          <input
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
            style={inputStyle}
          />
        </label>
        <label style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          Conditions générales
          <textarea
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            rows={3}
            style={{ ...inputStyle, flex: 1, resize: "vertical", fontFamily: "var(--font-ui)", fontSize: 12.5 }}
          />
        </label>
        <label style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          Notes
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            style={{ ...inputStyle, flex: 1, resize: "vertical", fontFamily: "var(--font-ui)", fontSize: 12.5 }}
          />
        </label>
        <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
          Statut
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            style={inputStyle}
          >
            <option value="brouillon">Brouillon</option>
            <option value="envoye">Envoyé</option>
            <option value="accepte">Accepté</option>
            <option value="refuse">Refusé</option>
            <option value="expire">Expiré</option>
          </select>
        </label>
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving || quoteLines.length === 0}
        style={{
          ...buttonStyle,
          opacity: saving || quoteLines.length === 0 ? 0.5 : 1,
          cursor: saving || quoteLines.length === 0 ? "default" : "pointer",
        }}
      >
        {saving ? "Enregistrement…" : "Sauvegarder le devis"}
      </button>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  padding: "6px 10px",
  fontSize: 12.5,
  background: "var(--surface)",
  color: "var(--text)",
};
const buttonStyle: React.CSSProperties = {
  background: "var(--accent)",
  color: "#fff",
  border: "none",
  borderRadius: "var(--radius)",
  padding: "9px 18px",
  fontWeight: 700,
  fontSize: 13.5,
  cursor: "pointer",
};
