"use client";

import { useTransition } from "react";

interface Stage {
  id: string;
  name: string;
}

export function DealStageSelect({
  dealId,
  stages,
  currentStageId,
  moveDealStage,
}: {
  dealId: string;
  stages: Stage[];
  currentStageId: string;
  moveDealStage: (formData: FormData) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      defaultValue={currentStageId}
      disabled={isPending}
      onChange={(e) => {
        const formData = new FormData();
        formData.set("dealId", dealId);
        formData.set("stageId", e.target.value);
        startTransition(() => {
          moveDealStage(formData);
        });
      }}
      style={{
        fontSize: 11,
        border: "1px solid var(--border)",
        borderRadius: 4,
        padding: "3px 5px",
        background: "var(--surface)",
        color: "var(--muted)",
      }}
    >
      {stages.map((stage) => (
        <option key={stage.id} value={stage.id}>
          {stage.name}
        </option>
      ))}
    </select>
  );
}
