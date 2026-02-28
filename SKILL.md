# bcm skill — Business Capability Modelling (agent guidance)

## Purpose

Model **what** the organisation must be able to do (enduring abilities), not **how** it does it (processes), **who** does it (teams), or **with what** (systems/technology). A well-built BCM is stable over time — it survives re-orgs, system replacements, and strategy pivots because it describes outcomes, not implementation.

## Output format

**Always output models as CSV.** Use these columns:

| Column | Required | Description |
|--------|----------|-------------|
| `id` | Yes | Hierarchical path-based slug: `domain-slug/capability-slug/sub-slug` |
| `name` | Yes | Title Case noun-phrase capability name (globally unique across entire model) |
| `level` | Yes | Hierarchy depth: `L1`, `L2`, `L3`, etc. `bcm` infers parent–child relationships automatically. |
| `category` | Yes | `core`, `strategic`, or `supporting` |
| `description` | Yes | Structured markdown with **blank lines between sections** (quote the field) |

Complete example — a small model as a single CSV file:

```csv
id,name,level,category,description
acme,Acme Corp,L1,supporting,"**Scope:** Root capability for Acme Corp.

**Includes:** Customer management, product management, financial management.

**Excludes:** External partner operations."
acme/customer-management,Customer Management,L2,core,"**Scope:** Acquire, retain, and manage customer relationships.

**Includes:** Onboarding, retention, data management.

**Excludes:** Billing (see Financial Management).

**Business outcomes:** Higher customer lifetime value, reduced churn rate, improved satisfaction scores."
acme/customer-management/customer-onboarding,Customer Onboarding,L3,core,"**Scope:** Register, verify, and activate new customer accounts across all channels.

**Includes:** Identity verification, account creation, welcome communications, initial product setup.

**Excludes:** Credit assessment (see Credit Risk Assessment), KYC compliance (see Regulatory Compliance).

**Business outcomes:** Reduced onboarding cycle time, higher activation rates, fewer abandoned applications.

**Key information:** Customer applications, identity documents, account records, product eligibility rules."
```

Description detail increases with depth: L1 has Scope/Includes/Excludes, L2 adds Business outcomes, L3 (leaf) has all five sections. Separate every section with a blank line.

## Description template

To describe a capability, use this template in the `description` column (quote the CSV field):

```markdown
**Scope:** <1–2 sentences defining boundaries and purpose.>

**Includes:** <Comma-separated list of activities/sub-domains in scope.>

**Excludes:** <Items that might be confused as in-scope. State where they belong.>

**Business outcomes:** <2–4 measurable outcomes when performed well.>

**Key information:** <Primary data objects consumed or produced.>
```

### Depth rules

| Level | Required sections | Guidance |
|-------|-------------------|----------|
| L1 | Scope + Includes + Excludes | Abstract groupings — keep brief. |
| L2 | Scope + Includes + Excludes + Business outcomes | Add 2–3 measurable outcomes. |
| L3 (leaf) | All 5 sections | Leaf nodes are concrete capabilities — fully specify each section (2–4 sentences). |

**L1 example — "Customer Management" (domain grouping):**

```markdown
**Scope:** The ability to acquire, retain, and manage relationships with customers across all channels.

**Includes:** Customer onboarding, customer retention, customer data management, customer feedback.

**Excludes:** Product pricing (see Product Management), billing and invoicing (see Financial Management).
```

**L3 example — "Order Validation" (leaf):**

```markdown
**Scope:** Verify order completeness, pricing accuracy, and customer eligibility before fulfilment. Ensures only valid orders proceed to downstream fulfilment and payment processes.

**Includes:** Field completeness checks, price verification, credit-hold screening, address validation, SKU availability confirmation.

**Excludes:** Payment authorisation (see Payment Processing), fraud detection (see Fraud Management), inventory reservation (see Inventory Management).

**Business outcomes:** Invalid orders rejected before fulfilment, reduced order error rate, faster order-to-fulfilment cycle, fewer downstream returns caused by data errors.

**Key information:** Order records, customer credit status, product catalogue, pricing rules, address databases.
```

## MECE audit

Run these checks before final output:

1. **Overlap (ME):** For each capability, ask: "Could this live under a different parent?" If yes, rewrite Includes/Excludes boundaries or refactor until every capability has one unambiguous home. Cross-cutting concerns become enabling capabilities under a Supporting domain — never duplicate a capability.
2. **Gap (CE):** Ask: "What business outcomes are not covered?" Add missing capabilities or widen an existing capability's scope.
3. **Naming:** Every name must be a Title Case noun phrase ("Order Management", not "Manage Orders"). Never name after a process, system, team, or project. Every name must be globally unique — qualify duplicates (e.g., "Customer Data Governance" vs "Product Data Governance").
4. **Consistency:** All capabilities under the same parent must follow the same organising principle. Do not mix functional capabilities with process steps or technology components.
5. **Depth balance:** All domains should decompose to roughly the same depth.

## Workflow — single-agent (≤30 capabilities)

1. **Clarify** in 3 bullets: scope boundary, intended use (strategy / portfolio / heatmap), depth required.
2. **Draft L1 skeleton** — write the root row (named after the area being modelled), then 7–10 L2 domain rows beneath it. Fewer than 7 collapses distinctions; more than 12 fragments the model. Group domains via the `category` column (`core`, `strategic`, `supporting`). Lock naming conventions before going deeper.
3. **Fill L2 then L3** — write the description for each row per the depth rules table. Limit depth to 3–4 levels unless there is a concrete decision-making need for more.
4. **Run MECE audit** (all 5 checks). Revise until clean, then output the final CSV.

## Workflow — multi-agent swarm (>30 capabilities)

Use a **map-reduce pattern**: master agent orchestrates, sub-agents each own one domain.

### Step 1: Plan (master)

1. Define 7–12 L2 domains with a **scope contract** per domain: what's in, what's out, and which domain owns excluded items.
2. Lock naming conventions, depth target, and **max 20 rows per sub-agent**.
3. Create one task per domain.

### Step 2: Map (sub-agents, in parallel — two passes)

Spawn one sub-agent per domain. Each receives: domain name, scope contract, description template, depth target, and node cap. Sub-agents output at L2+ levels (root is L1 — sub-agents must not create L1 rows).

**Pass 1 — Structure:** Generate the full hierarchy with **Scope-only** descriptions. Output as CSV plus boundary notes (3–5 in-scope items, 3–5 out-of-scope items with owning domain). Do not write remaining description sections yet.

```csv
id,name,level,category,description
customer-management,Customer Management,L2,core,"**Scope:** Acquire, retain, and manage customer relationships."
customer-management/customer-onboarding,Customer Onboarding,L3,core,"**Scope:** Register, verify, and activate new customer accounts."
customer-management/customer-retention,Customer Retention,L3,core,"**Scope:** Maintain and strengthen existing customer relationships."
customer-management/customer-retention/churn-prevention,Churn Prevention,L4,core,"**Scope:** Identify at-risk customers and execute retention interventions."
```

**Pass 2 — Enrich:** After skeleton acceptance, fill remaining description sections per depth rules. Do not alter hierarchy or names — only add description content. Separate each section with a blank line.

### Step 3: Merge & validate (master)

Concatenate sub-agent CSVs under a single header. Prepend a root row (L1). Then validate:

1. **Unique IDs and names** — every `id` and `name` must be globally unique.
2. **MECE audit** — all 5 checks applied across the full merged model.
3. **Cross-domain dedup** — flag capability names with >70% similarity across domains. Resolve by choosing one home and updating the other domain's Excludes.
4. **Boundary reconciliation** — verify every sub-agent's out-of-scope items were claimed by another domain. Flag gaps and overlaps.
5. **Description completeness** — verify leaf nodes have all 5 template sections, L2 has 4, L1 has 3.

Send targeted revision requests for flagged issues. Repeat until clean.

## Rendering

Write the final CSV to a file and run:

```bash
bcm render model.csv --outDir out --svg --html
```

`bcm` accepts `.csv`, `.tsv`, and `.json` files (auto-detected from extension). Add `--png` or `--pdf` if needed. Use `bcm validate model.csv` first to catch structural issues.
