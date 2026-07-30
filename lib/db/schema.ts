import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  integer,
  numeric,
  jsonb,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

/**
 * Schéma KERF — voir ARCHITECTURE.md §4 pour la justification de chaque
 * entité. Toute table qui contient des données de tenant porte `tenantId`
 * et DOIT avoir sa policy RLS dans db/migrations/0001_rls.sql — la suite
 * tests/rls/isolation.test.ts échoue automatiquement sinon.
 */

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const roleEnum = pgEnum("role", [
  "platform_admin",
  "tenant_admin",
  "sales",
  "viewer",
]);

export const accountTypeEnum = pgEnum("account_type", [
  "atelier",
  "sous_traitant",
  "industriel",
  "distributeur",
]);

export const accountStatusEnum = pgEnum("account_status", [
  "prospect",
  "actif",
  "dormant",
]);

export const dealStatusEnum = pgEnum("deal_status", ["ouvert", "gagne", "perdu"]);

export const interactionKindEnum = pgEnum("interaction_kind", [
  "appel",
  "visite",
  "email",
  "reunion",
  "note",
]);

export const productFamilyEnum = pgEnum("product_family", [
  "plaquette",
  "fraise",
  "foret",
  "porte_outil",
  "serrage",
  "accessoire",
]);

export const materialClassEnum = pgEnum("material_class", [
  "carbure",
  "ceramique",
  "cbn",
  "pcd",
  "hss",
  "acier",
]);

export const quoteStatusEnum = pgEnum("quote_status", [
  "brouillon",
  "envoye",
  "accepte",
  "refuse",
  "expire",
]);

export const importKindEnum = pgEnum("import_kind", ["produits", "comptes", "contacts"]);
export const importStatusEnum = pgEnum("import_status", [
  "en_cours",
  "termine",
  "echoue",
]);

export const trialOperationEnum = pgEnum("trial_operation", [
  "tournage",
  "fraisage",
  "alesage",
  "rainurage",
  "filetage",
  "percage",
]);

export const trialStabilityEnum = pgEnum("trial_stability", ["bonne", "moyenne", "faible"]);

export const trialCoolingEnum = pgEnum("trial_cooling", [
  "arrosage",
  "air",
  "mql",
  "sec",
  "haute_pression",
]);

export const trialStatusEnum = pgEnum("trial_status", [
  "planifie",
  "en_cours",
  "concluant",
  "non_concluant",
  "abandonne",
]);

export const trialToolRoleEnum = pgEnum("trial_tool_role", ["reference", "candidat"]);

export const trialWearModeEnum = pgEnum("trial_wear_mode", [
  "usure_frontale",
  "entaille",
  "ecaillage",
  "rupture",
  "arete_rapportee",
  "deformation",
  "fissuration_thermique",
]);

export const trialVerdictEnum = pgEnum("trial_verdict", ["ok", "limite", "ko"]);

export const customFieldEntityEnum = pgEnum("custom_field_entity", [
  "account",
  "contact",
  "deal",
  "product",
  "trial",
]);

export const customFieldTypeEnum = pgEnum("custom_field_type", [
  "text",
  "number",
  "boolean",
  "date",
  "select",
]);

export const attachmentEntityEnum = pgEnum("attachment_entity", [
  "account",
  "contact",
  "deal",
  "quote",
  "trial",
]);

// ---------------------------------------------------------------------------
// Socle : tenants, membres, invitations, champs custom, audit, pièces jointes
// ---------------------------------------------------------------------------

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  // Voir ARCHITECTURE.md §3.6 : une seule couleur saisie, tout le reste dérivé au runtime.
  branding: jsonb("branding")
    .$type<{ accentHex?: string; logoPath?: string; logoUpdatedAt?: string }>()
    .notNull()
    .default({}),
  settings: jsonb("settings").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(), // auth.users(id), géré par Supabase Auth
    role: roleEnum("role").notNull().default("sales"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("memberships_tenant_user_uq").on(t.tenantId, t.userId)],
);

export const invitations = pgTable("invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: roleEnum("role").notNull().default("sales"),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const customFieldDefs = pgTable(
  "custom_field_defs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    entity: customFieldEntityEnum("entity").notNull(),
    key: text("key").notNull(),
    label: text("label").notNull(),
    type: customFieldTypeEnum("type").notNull(),
    options: jsonb("options").$type<string[]>().notNull().default([]),
    position: integer("position").notNull().default(0),
    required: boolean("required").notNull().default(false),
  },
  (t) => [uniqueIndex("custom_field_defs_tenant_entity_key_uq").on(t.tenantId, t.entity, t.key)],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id").notNull(),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: uuid("entity_id").notNull(),
    diff: jsonb("diff").$type<Record<string, unknown>>().notNull().default({}),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_log_tenant_entity_idx").on(t.tenantId, t.entity, t.entityId)],
);

export const attachments = pgTable("attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  entity: attachmentEntityEnum("entity").notNull(),
  entityId: uuid("entity_id").notNull(),
  storagePath: text("storage_path").notNull(),
  filename: text("filename").notNull(),
  mime: text("mime").notNull(),
  size: integer("size").notNull(),
  uploadedBy: uuid("uploaded_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// CRM
// ---------------------------------------------------------------------------

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    siret: text("siret"),
    type: accountTypeEnum("type").notNull(),
    sector: text("sector"),
    address: jsonb("address").$type<Record<string, unknown>>().notNull().default({}),
    phone: text("phone"),
    website: text("website"),
    ownerId: uuid("owner_id"),
    machinePark: jsonb("machine_park").$type<Record<string, unknown>[]>().notNull().default([]),
    status: accountStatusEnum("status").notNull().default("prospect"),
    custom: jsonb("custom").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("accounts_tenant_idx").on(t.tenantId)],
);

export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    roleTitle: text("role_title"),
    email: text("email"),
    phone: text("phone"),
    mobile: text("mobile"),
    isPrimary: boolean("is_primary").notNull().default(false),
    custom: jsonb("custom").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("contacts_tenant_idx").on(t.tenantId), index("contacts_account_idx").on(t.accountId)],
);

export const pipelines = pgTable("pipelines", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
});

export const pipelineStages = pgTable(
  "pipeline_stages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pipelineId: uuid("pipeline_id").notNull().references(() => pipelines.id, { onDelete: "cascade" }),
    // dénormalisé : simplifie la policy RLS (filtre direct sans jointure vers pipelines)
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    position: integer("position").notNull().default(0),
    probability: integer("probability").notNull().default(0),
    isWon: boolean("is_won").notNull().default(false),
    isLost: boolean("is_lost").notNull().default(false),
  },
  (t) => [index("pipeline_stages_pipeline_idx").on(t.pipelineId)],
);

export const deals = pgTable(
  "deals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
    pipelineId: uuid("pipeline_id").notNull().references(() => pipelines.id),
    stageId: uuid("stage_id").notNull().references(() => pipelineStages.id),
    title: text("title").notNull(),
    amount: numeric("amount", { precision: 14, scale: 4 }).notNull().default("0"),
    currency: text("currency").notNull().default("EUR"),
    expectedClose: timestamp("expected_close", { withTimezone: true }),
    ownerId: uuid("owner_id"),
    source: text("source"),
    trialId: uuid("trial_id"), // FK ajoutée après la table trials (dépendance circulaire évitée)
    status: dealStatusEnum("status").notNull().default("ouvert"),
    lostReason: text("lost_reason"),
    custom: jsonb("custom").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("deals_tenant_idx").on(t.tenantId), index("deals_stage_idx").on(t.stageId)],
);

export const interactions = pgTable(
  "interactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    entity: text("entity").notNull(), // account | contact | deal | trial
    entityId: uuid("entity_id").notNull(),
    kind: interactionKindEnum("kind").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    subject: text("subject").notNull(),
    body: text("body"),
    authorId: uuid("author_id").notNull(),
  },
  (t) => [index("interactions_tenant_entity_idx").on(t.tenantId, t.entity, t.entityId)],
);

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    entity: text("entity").notNull(),
    entityId: uuid("entity_id").notNull(),
    title: text("title").notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }),
    assigneeId: uuid("assignee_id"),
    doneAt: timestamp("done_at", { withTimezone: true }),
  },
  (t) => [index("tasks_tenant_idx").on(t.tenantId)],
);

// ---------------------------------------------------------------------------
// Catalogue & tarification
// ---------------------------------------------------------------------------

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    sku: text("sku").notNull(),
    name: text("name").notNull(),
    brand: text("brand"),
    family: productFamilyEnum("family").notNull(),
    materialClass: materialClassEnum("material_class"),
    grade: text("grade"),
    geometry: text("geometry"),
    coating: text("coating"),
    isoGroups: text("iso_groups").array().notNull().default(sql`'{}'::text[]`),
    applications: text("applications").array().notNull().default(sql`'{}'::text[]`),
    dimensions: jsonb("dimensions").$type<Record<string, unknown>>().notNull().default({}),
    listPrice: numeric("list_price", { precision: 14, scale: 4 }),
    currency: text("currency").notNull().default("EUR"),
    isActive: boolean("is_active").notNull().default(true),
    custom: jsonb("custom").$type<Record<string, unknown>>().notNull().default({}),
    datasheetPath: text("datasheet_path"),
  },
  (t) => [
    uniqueIndex("products_tenant_sku_uq").on(t.tenantId, t.sku),
    index("products_tenant_idx").on(t.tenantId),
  ],
);

export const priceLists = pgTable("price_lists", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  currency: text("currency").notNull().default("EUR"),
  validFrom: timestamp("valid_from", { withTimezone: true }),
  validTo: timestamp("valid_to", { withTimezone: true }),
  isDefault: boolean("is_default").notNull().default(false),
});

export const priceListItems = pgTable(
  "price_list_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    priceListId: uuid("price_list_id").notNull().references(() => priceLists.id, { onDelete: "cascade" }),
    productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    unitPrice: numeric("unit_price", { precision: 14, scale: 4 }).notNull(),
    discountPct: numeric("discount_pct", { precision: 5, scale: 2 }).notNull().default("0"),
    minQty: integer("min_qty").notNull().default(1),
  },
  (t) => [index("price_list_items_price_list_idx").on(t.priceListId)],
);

export const accountPricing = pgTable("account_pricing", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  priceListId: uuid("price_list_id").notNull().references(() => priceLists.id),
});

export const importJobs = pgTable("import_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  kind: importKindEnum("kind").notNull(),
  filename: text("filename").notNull(),
  mapping: jsonb("mapping").$type<Record<string, string>>().notNull().default({}),
  rowsTotal: integer("rows_total").notNull().default(0),
  rowsOk: integer("rows_ok").notNull().default(0),
  rowsError: integer("rows_error").notNull().default(0),
  report: jsonb("report").$type<Record<string, unknown>[]>().notNull().default([]),
  status: importStatusEnum("status").notNull().default("en_cours"),
  createdBy: uuid("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Devis
// ---------------------------------------------------------------------------

export const quotes = pgTable(
  "quotes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    number: text("number").notNull(), // séquence par tenant/année, générée en Server Action
    accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id").references(() => contacts.id),
    dealId: uuid("deal_id").references(() => deals.id),
    status: quoteStatusEnum("status").notNull().default("brouillon"),
    currency: text("currency").notNull().default("EUR"),
    validUntil: timestamp("valid_until", { withTimezone: true }),
    globalDiscountPct: numeric("global_discount_pct", { precision: 5, scale: 2 }).notNull().default("0"),
    notes: text("notes"),
    terms: text("terms"),
    subtotal: numeric("subtotal", { precision: 14, scale: 4 }).notNull().default("0"),
    taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).notNull().default("20"),
    total: numeric("total", { precision: 14, scale: 4 }).notNull().default("0"),
    pdfPath: text("pdf_path"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    ownerId: uuid("owner_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("quotes_tenant_number_uq").on(t.tenantId, t.number)],
);

export const quoteLines = pgTable(
  "quote_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    quoteId: uuid("quote_id").notNull().references(() => quotes.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
    productId: uuid("product_id").references(() => products.id),
    description: text("description").notNull(),
    quantity: numeric("quantity", { precision: 14, scale: 4 }).notNull().default("1"),
    unit: text("unit").notNull().default("pièce"),
    // Figés à la création : un devis émis ne doit jamais bouger si le catalogue change (ARCHITECTURE.md §4.4).
    unitPrice: numeric("unit_price", { precision: 14, scale: 4 }).notNull(),
    discountPct: numeric("discount_pct", { precision: 5, scale: 2 }).notNull().default("0"),
    lineTotal: numeric("line_total", { precision: 14, scale: 4 }).notNull(),
  },
  (t) => [index("quote_lines_quote_idx").on(t.quoteId)],
);

// ---------------------------------------------------------------------------
// Essais techniques — le module différenciateur
// ---------------------------------------------------------------------------

export const trials = pgTable(
  "trials",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    ref: text("ref").notNull(), // séquence par tenant, ex. E-0412
    accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id").references(() => contacts.id),
    ownerId: uuid("owner_id"),
    title: text("title").notNull(),
    objective: text("objective"),
    machineMake: text("machine_make"),
    machineModel: text("machine_model"),
    machinePowerKw: numeric("machine_power_kw", { precision: 6, scale: 2 }),
    spindleMaxRpm: integer("spindle_max_rpm"),
    stability: trialStabilityEnum("stability"),
    operation: trialOperationEnum("operation").notNull(),
    partRef: text("part_ref"),
    partQtyYear: integer("part_qty_year"),
    workpieceMaterial: text("workpiece_material").notNull(),
    workpieceIsoGroup: text("workpiece_iso_group"),
    hardnessHrc: numeric("hardness_hrc", { precision: 5, scale: 2 }),
    cooling: trialCoolingEnum("cooling"),
    status: trialStatusEnum("status").notNull().default("planifie"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    conclusion: text("conclusion"),
    custom: jsonb("custom").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("trials_tenant_ref_uq").on(t.tenantId, t.ref),
    index("trials_tenant_idx").on(t.tenantId),
  ],
);

export const trialTools = pgTable(
  "trial_tools",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    trialId: uuid("trial_id").notNull().references(() => trials.id, { onDelete: "cascade" }),
    role: trialToolRoleEnum("role").notNull(),
    productId: uuid("product_id").references(() => products.id),
    label: text("label").notNull(),
    materialClass: materialClassEnum("material_class"),
    grade: text("grade"),
    geometry: text("geometry"),
    coating: text("coating"),
    toolCost: numeric("tool_cost", { precision: 10, scale: 4 }),
    edgesPerInsert: integer("edges_per_insert").notNull().default(1),
  },
  (t) => [index("trial_tools_trial_idx").on(t.trialId)],
);

export const trialRuns = pgTable(
  "trial_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    trialToolId: uuid("trial_tool_id").notNull().references(() => trialTools.id, { onDelete: "cascade" }),
    runNo: integer("run_no").notNull(),
    vc: numeric("vc", { precision: 8, scale: 2 }), // m/min
    fn: numeric("fn", { precision: 8, scale: 4 }), // mm/tr
    ap: numeric("ap", { precision: 8, scale: 4 }), // mm
    ae: numeric("ae", { precision: 8, scale: 4 }), // mm
    rpm: integer("rpm"),
    feedMmMin: numeric("feed_mm_min", { precision: 10, scale: 2 }),
    passes: integer("passes").notNull().default(1),
    coolingOverride: trialCoolingEnum("cooling_override"),
    piecesPerEdge: integer("pieces_per_edge"),
    toolLifeMin: numeric("tool_life_min", { precision: 10, scale: 2 }),
    machiningTimePerPartS: numeric("machining_time_per_part_s", { precision: 10, scale: 2 }),
    wearMode: trialWearModeEnum("wear_mode"),
    wearVbMm: numeric("wear_vb_mm", { precision: 6, scale: 3 }),
    surfaceRa: numeric("surface_ra", { precision: 6, scale: 3 }),
    chipShape: text("chip_shape"),
    noiseVibration: text("noise_vibration"),
    verdict: trialVerdictEnum("verdict"),
    notes: text("notes"),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
    recordedBy: uuid("recorded_by").notNull(),
  },
  (t) => [index("trial_runs_tool_idx").on(t.trialToolId)],
);

export const trialPhotos = pgTable(
  "trial_photos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    trialRunId: uuid("trial_run_id").notNull().references(() => trialRuns.id, { onDelete: "cascade" }),
    storagePath: text("storage_path").notNull(),
    kind: text("kind").notNull(), // arete | copeau | piece | montage
    caption: text("caption"),
  },
  (t) => [index("trial_photos_run_idx").on(t.trialRunId)],
);

export const trialEconomics = pgTable("trial_economics", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  trialId: uuid("trial_id").notNull().references(() => trials.id, { onDelete: "cascade" }),
  hourlyMachineRate: numeric("hourly_machine_rate", { precision: 10, scale: 2 }).notNull(),
  hourlyLaborRate: numeric("hourly_labor_rate", { precision: 10, scale: 2 }).notNull(),
  baselineCostPerPart: numeric("baseline_cost_per_part", { precision: 10, scale: 4 }).notNull(),
  candidateCostPerPart: numeric("candidate_cost_per_part", { precision: 10, scale: 4 }).notNull(),
  savingPerPart: numeric("saving_per_part", { precision: 10, scale: 4 }).notNull(),
  savingPerYear: numeric("saving_per_year", { precision: 12, scale: 2 }).notNull(),
  paybackMonths: numeric("payback_months", { precision: 8, scale: 2 }),
  computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Relations (pour les requêtes imbriquées côté serveur)
// ---------------------------------------------------------------------------

export const accountsRelations = relations(accounts, ({ many }) => ({
  contacts: many(contacts),
  deals: many(deals),
  trials: many(trials),
}));

export const dealsRelations = relations(deals, ({ one }) => ({
  account: one(accounts, { fields: [deals.accountId], references: [accounts.id] }),
  stage: one(pipelineStages, { fields: [deals.stageId], references: [pipelineStages.id] }),
}));

export const trialsRelations = relations(trials, ({ one, many }) => ({
  account: one(accounts, { fields: [trials.accountId], references: [accounts.id] }),
  tools: many(trialTools),
  economics: many(trialEconomics),
}));

export const trialToolsRelations = relations(trialTools, ({ one, many }) => ({
  trial: one(trials, { fields: [trialTools.trialId], references: [trials.id] }),
  runs: many(trialRuns),
}));

export const trialRunsRelations = relations(trialRuns, ({ one, many }) => ({
  tool: one(trialTools, { fields: [trialRuns.trialToolId], references: [trialTools.id] }),
  photos: many(trialPhotos),
}));

export const quotesRelations = relations(quotes, ({ one, many }) => ({
  account: one(accounts, { fields: [quotes.accountId], references: [accounts.id] }),
  lines: many(quoteLines),
}));
