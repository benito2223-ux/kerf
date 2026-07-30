"use client";

import { useState } from "react";

const STEPS = [
  { key: "pipeline", label: "Configurer le pipeline", desc: "Vérifier que les étapes de vente sont prêtes" },
  { key: "compte", label: "Créer le premier compte", desc: "Ajouter au moins un compte client" },
  { key: "deal", label: "Créer le premier deal", desc: "Lancer votre première opportunité" },
  { key: "equipe", label: "Inviter l'équipe", desc: "Ajouter des collaborateurs au tenant" },
] as const;

type StepKey = typeof STEPS[number]["key"];

export function OnboardingPage({
  tenantSlug,
}: {
  tenantSlug: string;
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const completed = localStorage.getItem(`kerf:onboarding:${tenantSlug}`);
  const doneSet = new Set<string>(completed ? completed.split(",") : []);

  function toggleStep(key: StepKey) {
    const next = doneSet.has(key)
      ? [...doneSet].filter((k) => k !== key)
      : [...doneSet, key];
    localStorage.setItem(`kerf:onboarding:${tenantSlug}`, next.join(","));
    // Move forward if all prior steps done
    const idx = STEPS.findIndex((s) => s.key === key);
    if (!doneSet.has(key) && idx === currentStep) {
      const remaining = STEPS.slice(idx + 1).findIndex((s) => !doneSet.has(s.key));
      setCurrentStep(remaining === -1 ? idx + 1 : idx + 1 + remaining);
    }
  }

  const progress = (doneSet.size / STEPS.length) * 100;
  const allDone = doneSet.size === STEPS.length;

  return (
    <main style={{ padding: 32, maxWidth: 520 }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
        Bienvenue sur KERF
      </h1>
      <p style={{ fontSize: 12.5, color: "var(--faint)", marginBottom: 24 }}>
        Complétez les étapes ci-dessous pour configurer votre espace en quelques minutes.
      </p>

      {/* Progress bar */}
      <div
        style={{
          height: 6,
          background: "var(--canvas)",
          borderRadius: 3,
          marginBottom: 24,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progress}%`,
            background: "var(--accent)",
            borderRadius: 3,
            transition: "width 300ms ease",
          }}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {STEPS.map((step, idx) => {
          const isDone = doneSet.has(step.key);
          const isCurrent = idx === currentStep && !isDone;
          return (
            <label
              key={step.key}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                padding: "12px 14px",
                borderRadius: "var(--radius)",
                border: `1px solid ${isCurrent ? "var(--accent)" : "var(--border)"}`,
                background: isDone ? "var(--success-weak)" : isCurrent ? "var(--accent-weak)" : "var(--surface)",
                cursor: "pointer",
                transition: "border-color 120ms, background 120ms",
              }}
            >
              <input
                type="checkbox"
                checked={isDone}
                onChange={() => toggleStep(step.key)}
                style={{ marginTop: 3, accentColor: "var(--accent)" }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: isCurrent ? 700 : 500, color: isDone ? "var(--success)" : "var(--text)" }}>
                  {isDone ? "✓" : isCurrent ? "→" : ""}{" "}
                  {step.label}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                  {step.desc}
                </div>
              </div>
            </label>
          );
        })}
      </div>

      {allDone && (
        <div
          style={{
            marginTop: 24,
            padding: 14,
            borderRadius: "var(--radius)",
            background: "var(--success-weak)",
            border: "1px solid var(--success)",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--success)",
          }}
        >
          Prêt ! Votre espace est configuré. Commencez à ajouter des comptes et des
          deals.
        </div>
      )}
    </main>
  );
}
