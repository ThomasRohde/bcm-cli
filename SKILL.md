# bcm skill — Business Capability Modelling (agent guidance)

## Purpose

Model **what** the organisation must be able to do (enduring abilities), not **how** it does it (processes), **who** does it (teams), or **with what** (systems/technology). A well-built BCM is stable over time — it survives re-orgs, system replacements, and strategy pivots because it describes outcomes, not implementation.

## Output format

**Always output models as CSV.** CSV is far more token-efficient than nested JSON and is the preferred format for `bcm`. Use these columns:

| Column | Required | Description |
|--------|----------|-------------|
| `id` | Yes | Hierarchical path-based slug: `domain-slug/capability-slug/sub-slug` |
| `name` | Yes | Title Case capability name (globally unique) |
| `level` | Yes | Hierarchy depth: `L1`, `L2`, or `L3`. `bcm` infers parent–child relationships from this column automatically. |
| `category` | Yes | `core`, `strategic`, or `supporting` |
| `description` | Yes | Structured markdown with **blank lines between sections** (quote the field — CSV supports newlines inside quotes) |

**Important:** Separate each description section with a blank line so that `bcm` renders them as distinct paragraphs. Do **not** run sections together on one line.

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

Notice how description detail increases with depth: L1 has only Scope/Includes/Excludes, L2 adds Business outcomes, L3 (leaf) has all five sections. Every section is separated by a blank line for readable rendering.

Write the CSV to a file and feed it to `bcm`:

```bash
bcm render model.csv --outDir out --svg --html
```

## Structure

- **The first row is the root capability**, named after the area or subject being modelled (e.g., "Retail Banking", "Supply Chain Operations", "Acme Corp"). Every model must have exactly one root row.
- Use a multi-level hierarchy: **L1 Root → L2 Domain → L3 Sub-capability** (or deeper if needed, using L4 etc.).
- Start with **7–10 L2 domains** under the root to stay legible. Fewer than 7 collapses important distinctions; more than 12 fragments the model.
- Limit depth to **3–4 levels** unless there is a concrete decision-making need for more. Deep hierarchies become process catalogues.
- Group domains into strategic themes (e.g., **Core/Operational**, **Strategic**, **Supporting/Enabling**) via the `category` column.
- All capabilities under a parent must be **MECE** (see audit section below).

## Naming conventions

- Name capabilities as **noun phrases** describing an ability or outcome: "Order Management", "Credit Risk Assessment", "Claims Settlement".
- Use consistent **Title Case** throughout. Common suffixes: -ment, -tion, -ance, -ing (e.g., "Management", "Administration", "Governance", "Planning").
- Never name a capability after a process ("Approve Invoice"), a system ("Manage SAP"), a team ("HR Operations"), or a project ("Digital Transformation").
- Do not mix decomposition logics at the same level — keep the organising principle uniform (e.g., don't combine "Customer" with "Billing Process" with "SAP" at L1).
- **Every capability name must be unique across the entire model.** If two nodes would naturally share a name, qualify them to distinguish (e.g., "Customer Data Governance" vs. "Product Data Governance", not two nodes both called "Data Governance").

## Capability description template

Every capability **must** have a structured markdown description in the `description` column. Use this exact template (quote the CSV field when the description contains commas or newlines):

```markdown
**Scope:** <1–2 sentences defining what this capability covers — its boundaries and purpose.>

**Includes:** <Comma-separated list of key activities, functions, or sub-domains explicitly within scope.>

**Excludes:** <Comma-separated list of items that might be confused as in-scope but belong elsewhere. State where they belong.>

**Business outcomes:** <2–4 measurable outcomes this capability delivers when performed well.>

**Key information:** <Primary data objects consumed or produced (e.g., customer records, risk scores, order data).>
```

### Template examples

**Good — "Order Management" (L2 under Supply Chain):**

```markdown
**Scope:** The ability to receive, validate, track, and fulfil customer orders across all channels from receipt through delivery confirmation.

**Includes:** Order capture, order validation, order tracking, fulfilment coordination, returns initiation.

**Excludes:** Inventory planning (see Supply Planning), payment processing (see Financial Transaction Processing), last-mile delivery execution (see Logistics Execution).

**Business outcomes:** Orders fulfilled within SLA, order accuracy rate above target, complete order lifecycle visibility, reduced order-to-delivery cycle time.

**Key information:** Order records, fulfilment status, customer delivery preferences, SKU availability.
```

**Good — "Credit Risk Assessment" (L2 under Risk Management):**

```markdown
**Scope:** The ability to identify, evaluate, and quantify credit risk exposure for counterparties and portfolios to inform lending and investment decisions.

**Includes:** Counterparty credit scoring, portfolio risk aggregation, credit limit determination, watchlist monitoring.

**Excludes:** Market risk modelling (see Market Risk Management), regulatory capital calculation (see Regulatory Compliance), collections (see Receivables Management).

**Business outcomes:** Credit losses within risk appetite, timely identification of deteriorating exposures, defensible credit decisions, regulatory compliance on credit provisioning.

**Key information:** Credit scores, exposure data, collateral valuations, default probability models.
```

### Description depth by level

Leaf capabilities are the real, concrete capabilities used in production — for assessment, heatmaps, and portfolio decisions. They need the most detail to be unambiguous. Abstract groupings (L1/L2) just need enough to define scope boundaries.

| Level | Required sections | Guidance |
|-------|-------------------|----------|
| L1 | Scope + Includes + Excludes only | Scope: 1–2 sentences defining the domain boundary. Includes/Excludes: comma lists. These are abstract groupings — keep them brief. |
| L2 | Scope + Includes + Excludes + Business outcomes | Scope: 1–2 sentences. Business outcomes: 2–3 measurable outcomes. Omit Key information unless needed for clarity. |
| L3 (leaf) | All 5 (Scope, Includes, Excludes, Business outcomes, Key information) | 2–4 sentences per section. Leaf nodes are the capabilities people actually work with — they must be fully specified and unambiguous. |

**L1 example — "Customer Management" (domain grouping):**

```markdown
**Scope:** The ability to acquire, retain, and manage relationships with customers across all channels.

**Includes:** Customer onboarding, customer retention, customer data management, customer feedback.

**Excludes:** Product pricing (see Product Management), billing and invoicing (see Financial Management).
```

**L3 example — "Order Validation" (leaf under Order Management):**

```markdown
**Scope:** Verify order completeness, pricing accuracy, and customer eligibility before fulfilment. Ensures only valid orders proceed to downstream fulfilment and payment processes.

**Includes:** Field completeness checks, price verification, credit-hold screening, address validation, SKU availability confirmation.

**Excludes:** Payment authorisation (see Payment Processing), fraud detection (see Fraud Management), inventory reservation (see Inventory Management).

**Business outcomes:** Invalid orders rejected before fulfilment, reduced order error rate, faster order-to-fulfilment cycle, fewer downstream returns caused by data errors.

**Key information:** Order records, customer credit status, product catalogue, pricing rules, address databases.
```

### Bad descriptions (reject on sight)

- `"We use Salesforce to track customers."` — references a tool, describes an action not an ability.
- `"Sales activities."` — too vague, no scope or boundaries.
- `"Managing people."` — useless at any level; provides no decomposition guidance.
- A description mentioning a specific project, team, region, or timeline.

### Optional metadata columns

Beyond the required columns (`id`, `name`, `level`, `category`, `description`), add these as extra CSV columns when the user's request calls for assessment data:

| Column                  | Values / guidance |
|------------------------|-------------------|
| `maturity`             | `initial`, `managed`, `defined`, `measured`, `optimized` |
| `target_maturity`      | Same scale as maturity |
| `strategic_importance`  | `high`, `medium`, `low` |

## MECE audit (run at every merge and before final output)

1. **Overlap test (ME):** For each capability, ask: "Could this plausibly live under a different parent?" If yes, rewrite boundaries (Includes/Excludes) or refactor the hierarchy until every capability has exactly one unambiguous home.
2. **Gap test (CE):** Ask: "What business outcomes are not covered?" Add missing capabilities or explicitly widen an existing capability's scope.
3. **One-home rule:** Each capability has exactly one parent. Cross-cutting concerns become either (a) an "enabling" capability under a Supporting domain, or (b) explicit relationships/dependencies — never duplicated boxes.
4. **Consistency check:** All capabilities under the same parent must follow the same organising principle. Don't mix functional capabilities with process steps or technology components at the same level.
5. **Naming scan:** All nodes use noun-phrase Title Case. Flag any that read as processes (verb-first), systems, teams, or projects.
6. **Unique name check:** Every capability name must be globally unique. Flag duplicates and qualify them (e.g., "Customer Data Governance" vs. "Product Data Governance").
7. **Depth balance:** All domains should decompose to roughly the same depth. A domain that stops at L2 while siblings go to L4 suggests incomplete work.

## Agentic workflow — single-agent (small models, ≤30 capabilities)

1. **Clarify** in 3 bullets: scope boundary, intended use (strategy / portfolio / heatmap), depth required.
2. **Draft the L1 skeleton** — write the root row, then 7–10 domain rows beneath it. Lock naming conventions and decomposition rules before going deeper.
3. **Fill L2 then L3**, writing the description template for each row as you go (see description-depth-by-level table for which sections each level requires).
4. **Run MECE audit** (all 7 checks above). Revise until clean, then output the final model as CSV.

## Agentic workflow — multi-agent swarm (large models, >30 capabilities)

For large models, use a **map-reduce pattern** with sub-agents to parallelise the work. The master agent orchestrates; sub-agents each own one domain.

### Step 1: Plan (master agent)

1. Determine the domain list (7–12 L2 domains — the root is L1).
2. For each domain, write a **scope contract**: 2–3 sentences defining what is in-scope and what is explicitly out-of-scope (and which other domain owns it).
3. Lock naming conventions, depth target (e.g., L4), and target node count range per domain. Each sub-agent must produce **no more than 20 rows total**. If a domain requires more, split it into two sub-agents or reduce depth.
4. Create the task list with one task per domain.

### Step 2: Map (sub-agents, in parallel — two-pass)

Spawn one sub-agent per domain. Each sub-agent receives:

- **Domain name and scope contract** (what's in, what's out, and where out-of-scope items belong).
- **Naming rules**: Title Case noun phrases; no processes, systems, teams, or projects. Every name must be globally unique.
- **Description template**: The exact markdown template above (see description-depth-by-level table for which sections each level requires).
- **Starting level**: L2 (since the root is L1 — sub-agents must not start at L1).
- **Depth target and node count range**.
- **Node cap**: Maximum 20 rows per sub-agent output.
- **Output format**: CSV with columns `id,name,level,category,description`. Use hierarchical path-based IDs: `domain-slug/capability-slug/sub-slug`.

Each sub-agent works in **two passes**:

#### Pass 1 — Structure (skeleton + scope)

Generate the full hierarchy with names, IDs, and **Scope-only** descriptions (1 sentence each). Output the skeleton as CSV along with boundary notes. Do not write the remaining description sections yet.

**Important:** Use the levels that the rows will have in the final merged model (root = L1, domains = L2, sub-capabilities = L3). Do **not** start at L1 within your fragment — the master agent should not have to renumber levels.

```csv
id,name,level,category,description
customer-management,Customer Management,L2,core,"**Scope:** The ability to acquire, retain, and manage relationships with customers across all channels."
customer-management/customer-onboarding,Customer Onboarding,L3,core,"**Scope:** The ability to register, verify, and activate new customer accounts."
customer-management/customer-retention,Customer Retention,L3,core,"**Scope:** The ability to maintain and strengthen existing customer relationships."
customer-management/customer-retention/churn-prevention,Churn Prevention,L4,core,"**Scope:** Identify at-risk customers and execute retention interventions."
```

Along with **boundary notes**: 3–5 items explicitly in scope (that might be ambiguous) and 3–5 items explicitly out of scope (and which domain owns them).

#### Pass 2 — Enrich (fill remaining description sections)

After the skeleton is accepted (no structural problems flagged), fill in the remaining description sections per the description-depth-by-level table. Do **not** alter hierarchy, IDs, or names — only add description content. Output the updated CSV with full descriptions in quoted fields. Separate each section with a blank line.

- **L1 rows:** Add Includes and Excludes (comma lists). These are abstract groupings — keep them brief.
- **L2 rows:** Add Includes, Excludes, and Business outcomes.
- **L3/leaf rows:** Add all remaining sections — Includes, Excludes, Business outcomes, Key information (2–4 sentences each). Leaf nodes are the real capabilities used in production and must be fully specified.

### Step 3: Merge (master agent)

Combine sub-agent CSV outputs into a single CSV file. Since sub-agents already output at the correct merged levels (L2+), merging is just concatenation. Prepend a root row (L1) at the top:

```csv
id,name,level,category,description
enterprise,Enterprise,L1,supporting,"**Scope:** Root capability encompassing all enterprise domains."
customer-management,Customer Management,L2,core,"**Scope:** ..."
customer-management/customer-onboarding,Customer Onboarding,L3,core,"**Scope:** ..."
product-management,Product Management,L2,core,"**Scope:** ..."
product-management/product-development,Product Development,L3,core,"**Scope:** ..."
```

Write the merged CSV to a file (e.g., `merged-model.csv`). Strip the header row from each sub-agent's output and use a single shared header.

### Step 4: Validate (master agent)

Run these checks on the merged model:

1. **Duplicate ID detection** — every `id` must be globally unique.
2. **Unique name check** — every capability `name` must be globally unique across the entire model. Qualify duplicates (e.g., "Customer Data Governance" vs. "Product Data Governance").
3. **MECE audit** — all 7 checks from above, applied across the full merged model.
4. **Cross-domain semantic dedup** — compare all capability names across different domains. Flag pairs with >70% name similarity (e.g., "Customer Analytics" under Customer vs. "Customer Data Analysis" under Data). Resolve by choosing one home and updating the other domain's Excludes.
5. **Boundary note reconciliation** — for each sub-agent's "out of scope" items, verify another sub-agent claimed them. If no one did, there's a gap. If two agents claimed the same thing, there's an overlap.
6. **Depth and count balance** — flag any domain whose node count or depth is significantly different from its peers.
7. **Node count cap** — flag any sub-agent output exceeding 20 nodes. Split oversized domains or reduce L3 depth.
8. **Description completeness** — verify leaf nodes (L3 or deepest level) have all five template sections (Scope, Includes, Excludes, Business outcomes, Key information). L2 nodes need Scope, Includes, Excludes, and Business outcomes. L1 nodes need only Scope, Includes, and Excludes.

### Step 5: Reconcile (master agent, iterate if needed)

If the skeleton has **structural problems** (overlaps, gaps, naming violations, node count exceeded), send revision requests back to the relevant sub-agent(s) *before* Pass 2. This avoids wasting enrichment effort on a flawed hierarchy.

For flagged issues, send targeted revision requests:
- Duplicate names → ask the agent to qualify the name to make it unique (e.g., "Customer Data Governance" instead of "Data Governance").
- Semantic duplicates → ask the lower-priority domain's agent to remove and update Excludes.
- Missing coverage → ask the responsible domain's agent to add the missing capability.
- Node count exceeded → ask the agent to split or reduce L3 depth.
- Description gaps → ask the agent to complete the template per description-depth-by-level rules.

Repeat validation until clean.

### Step 6: Render

Feed the final merged CSV into bcm-cli:

```bash
bcm render merged-model.csv --html --svg
```

## Rendering the final model

Once the model is complete, use `bcm` to render it. Write the model to a file and run:

```bash
bcm render model.csv --outDir out --svg --html
```

`bcm` accepts `.csv`, `.tsv`, and `.json` files (format auto-detected from extension). Use `--format csv` to force CSV parsing when piping via stdin.

Add `--png` or `--pdf` if needed. Use `bcm validate model.csv` first to catch structural issues before rendering. Run `bcm guide` for full flag and schema documentation.

## Common anti-patterns (reject on sight)

| Anti-pattern | Why it's wrong |
|---|---|
| Capability named as a process ("Approve Invoice") | Processes describe *how*; capabilities describe *what* |
| Capability named after a system ("Manage SAP") | Systems are implementation; capabilities are stable |
| Capability named after a team ("HR Operations") | Org structure changes; capabilities shouldn't |
| Capability named after a project ("Digital Transformation") | Projects are temporary; capabilities are enduring |
| >12 domains under root | Illegible, likely mixing decomposition levels |
| >4 levels deep | Probably descended into process-step granularity |
| Same capability in multiple places | Breaks MECE and ownership; use enabling capabilities instead |
| Duplicate capability names across domains | Names must be globally unique; qualify with domain context (e.g., "Customer Analytics" not just "Analytics") |
| Description that mentions a vendor, tool, or specific technology | Capabilities must be technology-neutral |
| Capabilities under one parent that mix functions with processes or systems | Inconsistent decomposition logic at the same level |
