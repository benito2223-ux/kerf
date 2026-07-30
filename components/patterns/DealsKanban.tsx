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

export interface KanbanDeal {
  id: string;
  title: string;
  amount: string;
  stageId: string;
  accountName: string;
}

export interface KanbanStage {
  id: string;
  name: string;
}

/**
 * Kanban des deals avec glisser-déposer (dnd-kit).
 *
 * Remplace l'ancien sélecteur d'étape (DealStageSelect) : le geste
 * glisser-déposer est le cœur de l'ergonomie type HubSpot. Le sélecteur
 * reste disponible en repli clavier (accessibilité) mais n'est plus le
 * geste principal.
 *
 * Mise à jour optimiste : la carte bascule visuellement dès le drop, puis
 * le Server Action persiste. Si le serveur rejette, revalidatePath
 * resynchronise — le rollback visuel est géré par le re-render serveur.
 */
export function DealsKanban({
  stages,
  initialDeals,
  moveDealStage,
}: {
  stages: KanbanStage[];
  initialDeals: KanbanDeal[];
  moveDealStage: (formData: FormData) => Promise<void>;
}) {
  const [deals, setDeals] = useState(initialDeals);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // 5px de mouvement avant de démarrer le drag : évite de voler le
      // clic simple sur la carte.
      activationConstraint: { distance: 5 },
    }),
  );

  const activeDeal = activeId ? deals.find((d) => d.id === activeId) : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const dealId = String(active.id);
    // `over.id` est l'id d'une colonne-étape (droppable).
    const targetStageId = String(over.id);
    const deal = deals.find((d) => d.id === dealId);
    if (!deal || deal.stageId === targetStageId) return;

    // Optimiste : bascule visuelle immédiate.
    setDeals((prev) => prev.map((d) => (d.id === dealId ? { ...d, stageId: targetStageId } : d)));

    const formData = new FormData();
    formData.set("dealId", dealId);
    formData.set("stageId", targetStageId);
    startTransition(() => {
      moveDealStage(formData);
    });
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div style={{ flex: 1, overflow: "auto", padding: "18px 24px", display: "flex", gap: 14 }}>
        {stages.map((stage) => (
          <StageColumn
            key={stage.id}
            stage={stage}
            deals={deals.filter((d) => d.stageId === stage.id)}
          />
        ))}
      </div>

      <DragOverlay>
        {activeDeal ? <DealCard deal={activeDeal} isOverlay /> : null}
      </DragOverlay>

      {isPending && (
        <div
          style={{
            position: "fixed",
            bottom: 16,
            right: 16,
            fontSize: 12,
            color: "var(--muted)",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: "6px 12px",
          }}
        >
          Enregistrement…
        </div>
      )}
    </DndContext>
  );
}

function StageColumn({ stage, deals }: { stage: KanbanStage; deals: KanbanDeal[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const stageSum = deals.reduce((sum, d) => sum + Number(d.amount), 0);

  return (
    <div style={{ width: 260, flex: "none", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 6px 10px 6px" }}>
        <span style={{ fontSize: 12.6, fontWeight: 700 }}>{stage.name}</span>
        <span
          style={{
            fontSize: 11,
            color: "var(--faint)",
            background: "var(--canvas)",
            border: "1px solid var(--border)",
            borderRadius: 20,
            padding: "0 7px",
          }}
        >
          {deals.length}
        </span>
        <span
          style={{ marginLeft: "auto", fontSize: 11.5, fontWeight: 600, color: "var(--muted)" }}
          className="num-mono"
        >
          {stageSum.toLocaleString("fr-FR")} €
        </span>
      </div>

      <div
        ref={setNodeRef}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 9,
          minHeight: 120,
          borderRadius: "var(--radius)",
          outline: isOver ? "2px dashed var(--accent)" : "2px dashed transparent",
          outlineOffset: -2,
          background: isOver ? "var(--accent-weak)" : "transparent",
          transition: "background 120ms, outline-color 120ms",
          padding: 2,
        }}
      >
        {deals.map((deal) => (
          <DraggableDealCard key={deal.id} deal={deal} />
        ))}
        {deals.length === 0 && (
          <div
            style={{
              fontSize: 11.5,
              color: "var(--faint)",
              textAlign: "center",
              padding: "18px 8px",
              border: "1px dashed var(--border)",
              borderRadius: "var(--radius)",
            }}
          >
            Déposez un deal ici
          </div>
        )}
      </div>
    </div>
  );
}

function DraggableDealCard({ deal }: { deal: KanbanDeal }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: deal.id,
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
      }}
    >
      <DealCard deal={deal} />
    </div>
  );
}

function DealCard({ deal, isOverlay }: { deal: KanbanDeal; isOverlay?: boolean }) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "12px 13px",
        boxShadow: isOverlay ? "0 8px 24px rgba(23, 34, 45, 0.18)" : undefined,
        cursor: isOverlay ? "grabbing" : undefined,
      }}
    >
      <div style={{ fontWeight: 600, fontSize: 13 }}>{deal.title}</div>
      <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 3 }}>{deal.accountName}</div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 10,
        }}
      >
        <span className="num-mono" style={{ fontWeight: 700, fontSize: 13 }}>
          {Number(deal.amount).toLocaleString("fr-FR")} €
        </span>
      </div>
    </div>
  );
}
