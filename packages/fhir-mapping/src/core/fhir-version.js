/**
 * FHIR Version Configuration
 *
 * Centralises the FHIR version used throughout the fhir-mapping package.
 * Currently targets FHIR R4 (4.0.1). To migrate to R5, change the
 * constants below and update the version-specific resource/interaction
 * definitions in types.js.
 *
 * The @types/fhir library provides separate type namespaces per version:
 *   - fhir4  (R4 4.0.1)
 *   - fhir5  (R5 5.0.0)
 *
 * JSDoc annotations throughout this package reference fhir4.* types.
 * When switching to R5, change these references to fhir5.*.
 *
 * @module fhir-version
 */

/**
 * @typedef {'R4' | 'R5'} FhirVersionCode
 */

/**
 * @typedef {Object} FhirVersionConfig
 * @property {FhirVersionCode} version - FHIR version identifier
 * @property {string} fhirRelease - Full FHIR release string (e.g. '4.0.1')
 * @property {string} mimeType - FHIR content type for Accept/Content-Type headers
 * @property {string} namespaceUri - FHIR XML namespace URI
 * @property {string[]} additionalResourceTypes - Resource types added in this version
 *   that are not present in R4. Empty for R4 itself.
 */

/** @type {FhirVersionConfig} */
export const FHIR_R4 = Object.freeze({
  version: 'R4',
  fhirRelease: '4.0.1',
  mimeType: 'application/fhir+json',
  namespaceUri: 'http://hl7.org/fhir',
  additionalResourceTypes: []
});

/** @type {FhirVersionConfig} */
export const FHIR_R5 = Object.freeze({
  version: 'R5',
  fhirRelease: '5.0.0',
  mimeType: 'application/fhir+json',
  namespaceUri: 'http://hl7.org/fhir',
  additionalResourceTypes: [
    'NutritionIntake',
    'InventoryItem',
    'InventoryReport',
    'GenomicStudy',
    'ConditionDefinition',
    'DeviceAssociation',
    'EncounterHistory',
    'SubscriptionTopic'
  ]
});

/**
 * Active FHIR version used by this package.
 *
 * To switch versions:
 * 1. Change this assignment to FHIR_R5
 * 2. Update JSDoc type references from fhir4.* to fhir5.*
 * 3. Review FHIR_RESOURCE_TYPES in types.js for R5-specific additions
 * 4. Run the full test suite to verify compatibility
 *
 * @type {FhirVersionConfig}
 */
export const ACTIVE_FHIR_VERSION = FHIR_R4;

/**
 * FHIR mime type for HTTP Accept and Content-Type headers.
 * @type {string}
 */
export const FHIR_MIME_TYPE = ACTIVE_FHIR_VERSION.mimeType;

/**
 * Checks whether a FHIR resource type name is valid for the active version.
 *
 * @param {string} resourceType - e.g. 'DiagnosticReport'
 * @param {FhirVersionConfig} [config] - Override version config (default: active)
 * @returns {boolean}
 */
export function isValidResourceType(resourceType, config) {
  const version = config || ACTIVE_FHIR_VERSION;
  // R4 base types are always valid; R5 adds extras
  return R4_RESOURCE_TYPE_NAMES.includes(resourceType)
    || version.additionalResourceTypes.includes(resourceType);
}

/**
 * The 16 FHIR R4 resource types supported by this package for BPMN mapping.
 * This list is deliberately curated for clinical process modelling,
 * not an exhaustive catalogue of all FHIR resource types.
 *
 * @type {string[]}
 */
export const R4_RESOURCE_TYPE_NAMES = Object.freeze([
  'Condition',
  'Procedure',
  'Observation',
  'DiagnosticReport',
  'DocumentReference',
  'MedicationRequest',
  'MedicationAdministration',
  'ServiceRequest',
  'CarePlan',
  'Composition',
  'Bundle',
  'ImagingStudy',
  'Consent',
  'Patient',
  'Encounter',
  'Specimen'
]);
