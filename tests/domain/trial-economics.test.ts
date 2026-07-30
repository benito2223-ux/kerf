import { describe, expect, it } from "vitest";
import { annualSaving, costPerPart, paybackMonths } from "../../lib/domain/trial-economics";

describe("costPerPart", () => {
  it("répartit le coût outil sur toutes les pièces produites par l'outil", () => {
    const result = costPerPart({
      toolCost: 24,
      edgesPerInsert: 2,
      piecesPerEdge: 40,
      machiningTimePerPartS: 90,
      hourlyMachineRate: 60,
      hourlyLaborRate: 35,
    });
    // 24 € / (2 * 40) = 0.30 € de plaquette par pièce
    expect(result.toolCostPerPart).toBeCloseTo(0.3, 4);
    // (90/3600) h * (60+35) €/h = 2.375 €
    expect(result.timeCostPerPart).toBeCloseTo(2.375, 4);
    expect(result.totalCostPerPart).toBeCloseTo(2.675, 4);
  });

  it("rejette une configuration sans arêtes ou sans pièces par arête", () => {
    const base = {
      toolCost: 10,
      machiningTimePerPartS: 60,
      hourlyMachineRate: 50,
      hourlyLaborRate: 30,
    };
    expect(() => costPerPart({ ...base, edgesPerInsert: 0, piecesPerEdge: 10 })).toThrow();
    expect(() => costPerPart({ ...base, edgesPerInsert: 2, piecesPerEdge: 0 })).toThrow();
  });
});

describe("annualSaving", () => {
  it("calcule l'économie annuelle à partir de l'écart de coût par pièce", () => {
    expect(annualSaving(4.1, 2.84, 15000)).toBeCloseTo(18900, 0);
  });

  it("retourne une économie négative si le candidat coûte plus cher", () => {
    expect(annualSaving(2, 3, 1000)).toBe(-1000);
  });
});

describe("paybackMonths", () => {
  it("retourne 0 mois quand il n'y a aucun investissement supplémentaire", () => {
    expect(paybackMonths(0, 12000)).toBe(0);
  });

  it("calcule le nombre de mois nécessaires pour amortir un investissement", () => {
    // 2000 € investis, 12000 €/an d'économie = 1000 €/mois → 2 mois
    expect(paybackMonths(2000, 12000)).toBeCloseTo(2, 4);
  });

  it("retourne null quand l'économie mensuelle est nulle ou négative", () => {
    expect(paybackMonths(2000, 0)).toBeNull();
    expect(paybackMonths(2000, -500)).toBeNull();
  });
});
