# User Stories: FHIR Mapping Extension (fhirmap:) — MVP

> **Package:** `packages/fhir-mapping`
> **Moddle descriptor:** `fhir-mapping.json` (prefix `fhirmap`, URI `https://clinical-bpmn.org/fhir-mapping/v1`)
> **Date:** 2026-04-27

These user stories define the minimum viable product for the FHIR resource mapping extension. They follow INVEST criteria (Independent, Negotiable, Valuable, Estimable, Small, Testable) and include SMART acceptance criteria (Specific, Measurable, Achievable, Relevant, Time-bound within sprint scope).

---

## Epic 1: Core Mapping Model

### US-F01: Define FHIR resource mappings on BPMN tasks

**As a** clinical informaticist,
**I want to** declare which FHIR resource type a BPMN task produces or consumes, including the interaction type and direction,
**so that** BPMN process elements have explicit, machine-readable links to their FHIR representations.

**Acceptance Criteria:**

- A `fhirmap:resourceMappings` element can be added inside `bpmn2:extensionElements` of any `bpmn:FlowNode`.
- Each `fhirmap:resourceMapping` has required attribute `resourceType` (validated against `R4_RESOURCE_TYPE_NAMES`) and optional attributes: `profile` (canonical URL), `interaction` (create | read | update | search), `direction` (input | output), and `structureMapRef` (canonical URL).
- A task can have multiple resource mappings (e.g., Task_Staging produces both Observation and ServiceRequest).
- Round-trip test: resource mappings with all attributes survive XML save/load.

**Story Points:** 5

---

### US-F02: Define key elements on FHIR resource mappings

**As a** clinical informaticist,
**I want to** specify key elements (FHIRPath paths with semantic roles) on each resource mapping,
**so that** the mapping captures which FHIR fields are essential and how they should be populated.

**Acceptance Criteria:**

- `fhirmap:keyElement` is a child of `fhirmap:resourceMapping` with attributes: `path` (FHIRPath, e.g., "Observation.code"), `semanticRole` (classifier | trigger | payload), optional `terminologyBinding` (code system URI), optional `terminologyAspect` (term:annotation aspect for disambiguation), optional `fixedValue` (FHIR-structural constants only).
- Three mutually exclusive value-source patterns are supported:
  1. `fixedValue` only — for FHIR-structural constants (e.g., status="final", intent="order").
  2. `terminologyBinding` + `terminologyAspect` — resolved at runtime from the `term:coding` on the same BPMN element, matched by (aspect, system) composite key.
  3. Neither — for runtime/computed values.
- `fixedValue` and `terminologyBinding` must not be used together on the same key element.
- A resource mapping can have multiple key elements.
- Round-trip test: key elements with all attribute combinations survive serialization.
- Example (structural): `<fhirmap:keyElement path="Observation.status" semanticRole="trigger" fixedValue="final"/>`.
- Example (terminology): `<fhirmap:keyElement path="Observation.code" semanticRole="classifier" terminologyBinding="http://loinc.org" terminologyAspect="clinicalContent"/>`.

**Story Points:** 5

---

### US-F03: Define search parameters on FHIR resource mappings

**As a** clinical informaticist,
**I want to** attach FHIR search parameters (name/value pairs) to resource mappings,
**so that** the mapping specifies how to locate existing FHIR resources during process execution.

**Acceptance Criteria:**

- `fhirmap:searchParam` is a child of `fhirmap:resourceMapping` with attributes: `name` and `value`.
- Multiple search params can be specified per mapping.
- Round-trip test verifies search params survive serialization.
- Example: `<fhirmap:searchParam name="code" value="21908-9"/>`.

**Story Points:** 2

---

### US-F04: Define FHIR resource mappings on BPMN data objects

**As a** clinical informaticist,
**I want to** attach `fhirmap:resourceMapping` elements to `DataObjectReference` and `DataStoreReference`,
**so that** data artifacts (documents, data stores) in clinical workflows map to specific FHIR resource types like DocumentReference.

**Acceptance Criteria:**

- The `fhirmap:MappedElement` type extends `bpmn:DataObjectReference` and `bpmn:DataStoreReference` (as defined in `fhir-mapping.json`).
- `fhirmap:resourceMappings` with full key elements can be placed on data object extension elements.
- The `direction` attribute distinguishes input data objects (direction="input", interaction="read") from output data objects (direction="output", interaction="create").
- Round-trip test: annotated DataObjectReference with DocumentReference mapping survives save/load.
- Minimal example: DataObj_MRI maps to `DocumentReference` with direction="input"; DataObj_DischargeLetter maps to `DocumentReference` with direction="output".

**Story Points:** 3

---

## Epic 2: BPMN ↔ FHIR Mapping Logic

### US-F05: Map XOR gateways to PlanDefinition actions with selection behavior

**As a** clinical informaticist,
**I want** BPMN XOR (exclusive) gateways to map to FHIR PlanDefinition actions with `selectionBehavior: "exactly-one"`,
**so that** clinical decision points in the process model are represented as exclusive choices in the FHIR pathway definition.

**Acceptance Criteria:**

- An XOR gateway split is represented as a PlanDefinition action with `groupingBehavior: "visual-group"` and `selectionBehavior: "exactly-one"`.
- Each outgoing path (task after the gateway) becomes a nested action with a `condition` of `kind: "applicability"`.
- The applicability condition uses `language: "text/fhirpath"` with an expression that evaluates against process data.
- The join gateway is implicit (no separate FHIR action needed).
- Test: given a BPMN with XOR split → two tasks → XOR join, the exported mapping produces the correct PlanDefinition action hierarchy.

**Story Points:** 5

---

### US-F06: Map BPMN data input/output associations to PlanDefinition action inputs/outputs

**As a** clinical informaticist,
**I want** BPMN DataInputAssociation and DataOutputAssociation to map to PlanDefinition `action.input` and `action.output` respectively,
**so that** data dependencies between tasks and data objects are represented in the FHIR pathway.

**Acceptance Criteria:**

- A `bpmn2:dataInputAssociation` on a task referencing a DataObjectReference produces a PlanDefinition `action.input` entry with the corresponding FHIR resource type (e.g., DocumentReference).
- A `bpmn2:dataOutputAssociation` on a task referencing a DataObjectReference produces a PlanDefinition `action.output` entry.
- The input/output entries include `type` and `profile` fields.
- Test: given Task_Staging with DataInputAssociation → DataObj_MRI, the exported PlanDefinition action-staging has `input: [{ type: "DocumentReference" }]`.

**Story Points:** 5

---

### US-F07: Export FHIR mappings as JSON

**As a** developer,
**I want to** export all FHIR resource mappings from a BPMN model as a structured JSON object,
**so that** the mappings can be consumed by downstream tools (code generators, validators, documentation generators).

**Acceptance Criteria:**

- `MappingHelper.exportMappingsAsJson(elementRegistry)` returns `{ fhirVersion: "R4", elements: [...] }`.
- Each element entry includes: `bpmnId`, `bpmnType`, `bpmnName`, and `mappings[]`.
- Each mapping entry includes: `resourceType`, `profile`, `interaction`, `direction`, `keyElements[]`, `searchParams[]`.
- Only elements with at least one resource mapping are included.
- Test: export from a model with annotated tasks and data objects produces the expected structure.

**Story Points:** 3

---

## Epic 3: Properties Panel UI

### US-F08: Display FHIR resource mappings in the properties panel

**As a** clinical informaticist using the bpmn-js editor,
**I want to** see the FHIR resource mappings of the selected BPMN element in a dedicated "FHIR Mapping" panel section,
**so that** I can review which FHIR resources are associated with each process element.

**Acceptance Criteria:**

- When a FlowNode or DataObjectReference is selected, the properties panel shows a "FHIR Mapping" section.
- Each resource mapping is displayed as a card showing: resource type, profile (if set), interaction, direction.
- Key elements within each mapping are listed with: path, semantic role, and fixed value or terminology binding.
- Search params are listed with name/value pairs.
- Empty state: "No FHIR mappings" with an "Add Mapping" button.

**Story Points:** 8

---

### US-F09: Add and edit FHIR resource mappings via the properties panel

**As a** clinical informaticist,
**I want to** add, edit, and remove FHIR resource mappings through the properties panel UI,
**so that** I can define BPMN-to-FHIR mappings without editing XML manually.

**Acceptance Criteria:**

- "Add Mapping" creates a `fhirmap:resourceMapping` with a resource type dropdown populated from `getActiveResourceTypes()`.
- The user can set profile (text input), interaction (dropdown), direction (dropdown), and structureMapRef (text input).
- Key elements can be added/removed with: path (text), semanticRole (dropdown: classifier, trigger, payload), fixedValue (text, exclusive with terminologyBinding), terminologyBinding (text, code system URI), terminologyAspect (dropdown, from term:annotation aspects).
- Search params can be added/removed.
- Removing a mapping deletes the `fhirmap:resourceMapping` element.
- All edits are undoable via the bpmn-js command stack.

**Story Points:** 8

---

## Epic 4: FHIR Version Support and Type Safety

### US-F10: Centralized FHIR version configuration with R4/R5 switching

**As a** developer,
**I want to** switch between FHIR R4 and FHIR R5 in the fhir-mapping package by changing a single configuration value,
**so that** the package supports FHIR version evolution without scattered changes.

**Acceptance Criteria:**

- `fhir-version.js` exports `FHIR_R4`, `FHIR_R5`, `ACTIVE_FHIR_VERSION`, `FHIR_MIME_TYPE`, `isValidResourceType()`, and `R4_RESOURCE_TYPE_NAMES`.
- `FHIR_R5` config includes `additionalResourceTypes` for R5-only resources (NutritionIntake, InventoryItem, GenomicStudy, SubscriptionTopic).
- `isValidResourceType(name)` validates against the active version's resource type list.
- `getActiveResourceTypes()` in `types.js` returns only resource types valid for `ACTIVE_FHIR_VERSION`.
- `@types/fhir` JSDoc typedefs provide in-code type safety (FhirCoding, FhirCodeableConcept, FhirBundle, etc.).
- Tests: R4 is default; R5 config is structurally valid; MIME type is correct; resource type validation works.

**Story Points:** 3

---

### US-F11: FHIR resource type registry with version-aware filtering

**As a** developer,
**I want** the `FHIR_RESOURCE_TYPES` constant to carry a `fhirVersion` field on each entry,
**so that** UI dropdowns and validation logic can filter resource types by the active FHIR version.

**Acceptance Criteria:**

- Each entry in `FHIR_RESOURCE_TYPES` has: `type`, `label`, and `fhirVersion` ("R4" or "R5").
- `getActiveResourceTypes()` returns entries where `fhirVersion` matches `ACTIVE_FHIR_VERSION.name` or is "R4" (since R5 is backward-compatible).
- The resource type dropdown in the properties panel (US-F09) uses `getActiveResourceTypes()`.
- Test: when `ACTIVE_FHIR_VERSION` is R4, R5-only types are excluded.

**Story Points:** 2

---

## Epic 5: FHIR Bundle Generation

### US-F12: Generate a FHIR transaction Bundle from annotated BPMN

**As a** clinical informaticist,
**I want to** generate a FHIR R4 transaction Bundle from an annotated BPMN model,
**so that** the clinical pathway can be loaded into a FHIR server as a PlanDefinition with referenced resources.

**Acceptance Criteria:**

- The generator produces a valid FHIR R4 `Bundle` with `type: "transaction"`.
- The BPMN process maps to a `PlanDefinition` with `type: "clinical-protocol"`.
- Each task with a `fhirmap:resourceMapping` of `direction: "output"` generates the appropriate resource (ActivityDefinition, etc.) linked via `definitionCanonical`.
- DataObjectReferences with DocumentReference mappings generate `DocumentReference` resources in the Bundle.
- All internal references use `urn:uuid:` fullUrls and resolve within the Bundle.
- Each entry has a `request` with `method` and `url` for transaction processing.
- Test: annotated minimal example produces a Bundle structurally equivalent to `lung-cancer-staging-fhir.json`.

**Story Points:** 13

---

## Epic 6: Validation

### US-F13: Validate FHIR resource mappings against the FHIR specification

**As a** clinical informaticist,
**I want** the editor to validate that `resourceType`, `path`, and `interaction` values in fhirmap: elements are valid FHIR R4 terms,
**so that** I receive immediate feedback on mapping errors before exporting.

**Acceptance Criteria:**

- `isValidResourceType(name)` returns false for unknown resource types and true for valid ones.
- FHIRPath expressions in `keyElement.path` are validated to start with a known resource type (e.g., "Observation.code" is valid, "Foo.bar" is not).
- Interaction values are validated against the set: create, read, update, delete, search.
- Validation errors are surfaced in the properties panel as inline warnings.
- Test: invalid resource type, invalid path prefix, and invalid interaction all produce validation errors.

**Story Points:** 5

---

## Story Map Summary

| Priority | Story | Points | Dependencies |
|----------|-------|--------|--------------|
| P0 | US-F01 Resource mappings on tasks | 5 | — |
| P0 | US-F02 Key elements with terminology resolution | 5 | US-F01 |
| P0 | US-F03 Search parameters | 2 | US-F01 |
| P0 | US-F04 Resource mappings on data objects | 3 | US-F01 |
| P1 | US-F05 XOR gateway → PlanDefinition mapping | 5 | US-F01 |
| P1 | US-F06 Data associations → action I/O | 5 | US-F04 |
| P1 | US-F07 Export mappings as JSON | 3 | US-F01, US-F02 |
| P1 | US-F10 FHIR version configuration | 3 | — |
| P1 | US-F11 Version-aware resource type registry | 2 | US-F10 |
| P2 | US-F08 Properties panel (read) | 8 | US-F01, US-F10 |
| P2 | US-F09 Properties panel (write) | 8 | US-F08 |
| P2 | US-F12 FHIR Bundle generation | 13 | US-F05, US-F06, US-F07 |
| P2 | US-F13 Mapping validation | 5 | US-F10, US-F11 |

**Total MVP Story Points:** 67
