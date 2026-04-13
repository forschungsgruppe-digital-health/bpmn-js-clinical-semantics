/**
 * FHIR mapping type definitions and constants.
 *
 * All FHIR types are aligned with FHIR R4 (4.0.1) via @types/fhir.
 * When migrating to R5, update the JSDoc references from fhir4.* to fhir5.*
 * and review the resource type / interaction lists for R5 additions.
 *
 * @see {@link https://hl7.org/fhir/R4/resourcelist.html} FHIR R4 Resource Index
 * @see {@link ./fhir-version.js} for the active FHIR version configuration
 */

import { ACTIVE_FHIR_VERSION, R4_RESOURCE_TYPE_NAMES } from './fhir-version.js';

// ─── JSDoc Type Aliases (from @types/fhir) ──────────────────
//
// These typedefs make fhir4 types available for JSDoc throughout
// the package. When switching to R5, change 'fhir4' to 'fhir5'.
//
// Usage in other files:
//   @type {import('@types/fhir').fhir4.Coding}
//   @type {import('@types/fhir').fhir4.Bundle}

/**
 * A FHIR R4 Coding — a code from a terminology system.
 * @typedef {import('@types/fhir').fhir4.Coding} FhirCoding
 */

/**
 * A FHIR R4 CodeableConcept — wraps one or more Codings.
 * @typedef {import('@types/fhir').fhir4.CodeableConcept} FhirCodeableConcept
 */

/**
 * A FHIR R4 Reference — a pointer to another resource.
 * @typedef {import('@types/fhir').fhir4.Reference} FhirReference
 */

/**
 * A FHIR R4 Bundle — a collection of resources.
 * @typedef {import('@types/fhir').fhir4.Bundle} FhirBundle
 */

/**
 * A FHIR R4 Parameters resource — used for operation requests/responses.
 * @typedef {import('@types/fhir').fhir4.Parameters} FhirParameters
 */

/**
 * A FHIR R4 OperationOutcome — returned on errors.
 * @typedef {import('@types/fhir').fhir4.OperationOutcome} FhirOperationOutcome
 */

// ─── Resource Mapping Types ─────────────────────────────────

/**
 * A FHIR resource type supported for BPMN element mapping.
 *
 * @typedef {Object} FhirResourceTypeEntry
 * @property {string} type - FHIR resource type name (e.g. 'DiagnosticReport')
 * @property {string} label - Human-readable label with German translation
 * @property {string} fhirVersion - FHIR version this type is defined in ('R4' or 'R5')
 */

/**
 * Curated list of FHIR resource types for clinical process mapping.
 * Each entry includes the R4 resource type name and a bilingual label.
 *
 * To add R5-specific resource types, append entries with fhirVersion: 'R5'.
 * They will only be active when ACTIVE_FHIR_VERSION is set to FHIR_R5.
 *
 * @type {FhirResourceTypeEntry[]}
 */
export const FHIR_RESOURCE_TYPES = [
  { type: 'Condition', label: 'Condition (Diagnose)', fhirVersion: 'R4' },
  { type: 'Procedure', label: 'Procedure (Prozedur)', fhirVersion: 'R4' },
  { type: 'Observation', label: 'Observation (Befund/Messwert)', fhirVersion: 'R4' },
  { type: 'DiagnosticReport', label: 'DiagnosticReport (Befundbericht)', fhirVersion: 'R4' },
  { type: 'DocumentReference', label: 'DocumentReference (Dokument)', fhirVersion: 'R4' },
  { type: 'MedicationRequest', label: 'MedicationRequest (Medikation)', fhirVersion: 'R4' },
  { type: 'MedicationAdministration', label: 'MedicationAdministration', fhirVersion: 'R4' },
  { type: 'ServiceRequest', label: 'ServiceRequest (Anforderung)', fhirVersion: 'R4' },
  { type: 'CarePlan', label: 'CarePlan (Behandlungsplan)', fhirVersion: 'R4' },
  { type: 'Composition', label: 'Composition (Dokument-Composition)', fhirVersion: 'R4' },
  { type: 'Bundle', label: 'Bundle (Nachricht/Transaktion)', fhirVersion: 'R4' },
  { type: 'ImagingStudy', label: 'ImagingStudy (Bildgebung)', fhirVersion: 'R4' },
  { type: 'Consent', label: 'Consent (Einwilligung)', fhirVersion: 'R4' },
  { type: 'Patient', label: 'Patient', fhirVersion: 'R4' },
  { type: 'Encounter', label: 'Encounter (Fall/Kontakt)', fhirVersion: 'R4' },
  { type: 'Specimen', label: 'Specimen (Probe)', fhirVersion: 'R4' }
];

/**
 * Returns the FHIR resource types available for the active FHIR version.
 * Filters out R5-only types when running in R4 mode.
 *
 * @returns {FhirResourceTypeEntry[]}
 */
export function getActiveResourceTypes() {
  const version = ACTIVE_FHIR_VERSION.version;
  if (version === 'R5') {
    return FHIR_RESOURCE_TYPES; // R5 includes all R4 types
  }
  return FHIR_RESOURCE_TYPES.filter(rt => rt.fhirVersion === 'R4');
}

/**
 * FHIR interaction types for resource operations.
 * These are stable across R4 and R5.
 *
 * @type {Array<{ value: string, label: string }>}
 */
export const INTERACTIONS = [
  { value: 'create', label: 'create (erzeugen)' },
  { value: 'read', label: 'read (lesen)' },
  { value: 'update', label: 'update (aktualisieren)' },
  { value: 'search', label: 'search (suchen)' },
  { value: 'transaction', label: 'transaction (Bündel)' }
];

/**
 * Data flow directions for FHIR resource mappings.
 *
 * @type {Array<{ value: string, label: string }>}
 */
export const DIRECTIONS = [
  { value: 'input', label: 'Input (konsumiert)' },
  { value: 'output', label: 'Output (erzeugt)' },
  { value: 'input-output', label: 'Input-Output (beides)' }
];

/**
 * Semantic roles for FHIR key elements in BPMN process mappings.
 *
 * @type {Array<{ value: string, label: string }>}
 */
export const SEMANTIC_ROLES = [
  { value: 'trigger', label: 'Trigger (löst Prozessschritt aus)' },
  { value: 'filter', label: 'Filter (Selektionskriterium)' },
  { value: 'classifier', label: 'Classifier (Typisierung)' },
  { value: 'identifier', label: 'Identifier (Identifikation)' },
  { value: 'payload', label: 'Payload (Kerninhalt)' }
];
