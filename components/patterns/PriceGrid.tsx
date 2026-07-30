"use client";

import { useState, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

interface PriceListItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  unitPrice: number;
  discountPct: number;
}

/**
 * Grille tarifaire interactive avec drag & drop pour réorganiser
 * l'ordre des produits par famille/priorité.
 */
export function PriceGrid({
  initialItems,
  onUpdate,
}: {
  initialItems: PriceListItem[];
  onUpdate: (items: PriceListItem[]) => void;
}) {
  const [items, setItems] = useState(initialItems);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const activeItem = activeId != null ? items.find((i) => i.id === activeId) : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const fromIdx = items.findIndex((i) => i.id === String(active.id));
    const toIdx = items.findIndex((i) => i.id === String(over.id));
    if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return;

    const reordered = [...items];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    setItems(reordered);
    onUpdate(reordered);
  }

  function handlePriceChange(id: string, newPrice: number) {
    const updated = items.map((item) =>
      item.id === id ? { ...item, unitPrice: newPrice } : item,
    );
    setItems(updated);
    onUpdate(updated);
  }

  function handleDiscountChange(id: string, newDiscount: number) {
    const updated = items.map((item) =>
      item.id === id ? { ...item, discountPct: newDiscount } : item,
    );
    setItems(updated);
    onUpdate(updated);
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {items.map((item, idx) => (
          <DraggablePriceRow
            key={item.id}
            item={item}
            index={idx}
            onPriceChange={handlePriceChange}
            onDiscountChange={handleDiscountChange}
          />
        ))}
        {items.length === 0 && (
          <div style={{ textAlign: "center", padding: 24, color: "var(--faint)", fontSize: 12.5 }}>
            Aucun prix pour ce client. Importez des produits ou ajoutez un prix manuellement.
          </div>
        )}
      </div>

      {isPending && (
        <div style={{ position: "fixed", bottom: 16, right: 16, fontSize: 12, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "6px 12px" }}>
          Enregistrement…
        </div>
      )}
    </DndContext>
  );
}

function DraggablePriceRow({
  item,
  index,
  onPriceChange,
  onDiscountChange,
}: {
  item: PriceListItem;
  index: number;
  onPriceChange: (id: string, price: number) => void;
  onDiscountChange: (id: string, discount: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.4 : 1,
        cursor: "grab",
        touchAction: "none",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 12px",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        boxShadow: isDragging ? "0 4px 12px rgba(23, 34, 45, 0.12)" : undefined,
      }}
    >
      <span style={{ fontSize: 11.5, color: "var(--faint)", width: 24, textAlign: "right", fontFamily: "var(--font-mono)" }}>
        {index + 1}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {item.sku} — {item.productName}
        </div>
      </div>
      <label style={{ fontSize: 11, color: "var(--muted)", flex: "none", width: 90 }}>
        Prix
        <input
          type="number"
          step="0.1"
          min="0"
          value={item.unitPrice}
          onChange={(e) => onPriceChange(item.id, Number(e.target.value))}
          style={{ ...inputStyle, width: 80, textAlign: "right" }}
          className="num-mono"
        />
      </label>
      <label style={{ fontSize: 11, color: "var(--muted)", flex: "none", width: 80 }}>
        Remise %
        <input
          type="number"
          step="0.5"
          min="0"
          max="100"
          value={item.discountPct}
          onChange={(e) => onDiscountChange(item.id, Number(e.target.value))}
          style={{ ...inputStyle, width: 60, textAlign: "right" }}
          className="num-mono"
        />
      </label>
      <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--accent)", width: 80, textAlign: "right" }} className="num-mono">
        {(item.unitPrice * (1 - item.discountPct / 100)).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
      </span>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 4,
  padding: "4px 6px",
  fontSize: 12,
  background: "var(--canvas)",
  color: "var(--text)",
};
