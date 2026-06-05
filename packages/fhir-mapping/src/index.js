// ─── FHIR Version Configuration ─────────────────────────────
export {
  ACTIVE_FHIR_VERSION,
  FHIR_R4,
  FHIR_R5,
  FHIR_MIME_TYPE,
  isValidResourceType,
  R4_RESOURCE_TYPE_NAMES
} from './core/fhir-version.js';

// ─── Core ────────────────────────────────────────────────────
export {
  FHIR_RESOURCE_TYPES,
  INTERACTIONS,
  DIRECTIONS,
  SEMANTIC_ROLES,
  getActiveResourceTypes
} from './core/types.js';

// ─── moddle descriptor ───────────────────────────────────────
export { default as FhirMappingModdleDescriptor } from './moddle/fhir-mapping.json';

// ─── Properties Panel module (for bpmn-js additionalModules) ─
export { default as FhirMappingPropertiesPanelModule } from './properties-panel/index.js';

// ─── Helpers ─────────────────────────────────────────────────
export {
  getResourceMappings,
  getBindableTerminologyAnnotations,
  addResourceMapping,
  removeResourceMapping,
  exportMappingsAsJson
} from './services/MappingHelper.js';
