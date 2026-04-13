// ─── Core ────────────────────────────────────────────────────
export {
  FHIR_RESOURCE_TYPES,
  INTERACTIONS,
  DIRECTIONS,
  SEMANTIC_ROLES
} from './core/types.js';

// ─── moddle descriptor ───────────────────────────────────────
export { default as FhirMappingModdleDescriptor } from './moddle/fhir-mapping.json';

// ─── Properties Panel module (for bpmn-js additionalModules) ─
export { default as FhirMappingPropertiesPanelModule } from './properties-panel/index.js';

// ─── Helpers ─────────────────────────────────────────────────
export {
  getResourceMappings,
  addResourceMapping,
  removeResourceMapping,
  exportMappingsAsJson
} from './services/MappingHelper.js';
