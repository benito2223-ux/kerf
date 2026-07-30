/**
 * Calculs économiques d'un essai (ARCHITECTURE.md §4.5 et §7).
 * Code pur : aucun accès base, aucun composant. Ce sont les chiffres
 * montrés à un client pour justifier un changement d'outil — ils doivent
 * être exacts et vérifiables indépendamment de l'UI qui les affiche.
 */

export interface CostPerPartInput {
  /** Prix de l'outil (plaquette, foret…), en euros. */
  toolCost: number;
  /** Nombre d'arêtes utilisables par outil. */
  edgesPerInsert: number;
  /** Pièces usinées par arête avant changement. */
  piecesPerEdge: number;
  /** Temps d'usinage par pièce, en secondes. */
  machiningTimePerPartS: number;
  hourlyMachineRate: number;
  hourlyLaborRate: number;
}

export interface CostPerPartResult {
  toolCostPerPart: number;
  timeCostPerPart: number;
  totalCostPerPart: number;
}

export function costPerPart(input: CostPerPartInput): CostPerPartResult {
  const { toolCost, edgesPerInsert, piecesPerEdge, machiningTimePerPartS, hourlyMachineRate, hourlyLaborRate } = input;

  if (edgesPerInsert <= 0) throw new Error("edgesPerInsert doit être > 0");
  if (piecesPerEdge <= 0) throw new Error("piecesPerEdge doit être > 0");

  const partsPerTool = edgesPerInsert * piecesPerEdge;
  const toolCostPerPart = toolCost / partsPerTool;

  const hoursPerPart = machiningTimePerPartS / 3600;
  const timeCostPerPart = hoursPerPart * (hourlyMachineRate + hourlyLaborRate);

  return {
    toolCostPerPart,
    timeCostPerPart,
    totalCostPerPart: toolCostPerPart + timeCostPerPart,
  };
}

export function annualSaving(baselineCostPerPart: number, candidateCostPerPart: number, partsPerYear: number): number {
  return (baselineCostPerPart - candidateCostPerPart) * partsPerYear;
}

/**
 * Retour sur investissement en mois. `additionalInvestment` couvre par
 * exemple un porte-outil ou un montage nécessaire au changement — 0 si le
 * candidat ne demande aucun investissement supplémentaire.
 * Retourne `null` quand l'économie mensuelle est nulle ou négative : un
 * ROI n'existe pas dans ce cas, on ne doit jamais afficher un nombre.
 */
export function paybackMonths(additionalInvestment: number, savingPerYear: number): number | null {
  const monthlySaving = savingPerYear / 12;
  if (monthlySaving <= 0) return null;
  if (additionalInvestment <= 0) return 0;
  return additionalInvestment / monthlySaving;
}
