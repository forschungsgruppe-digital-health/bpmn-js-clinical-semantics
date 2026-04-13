// ─── FHIR Version Configuration ─────────────────────────────
export {
  ACTIVE_FHIR_VERSION,
  FHIR_R4,
  FHIR_R5,
  FHIR_MIME_TYPE
} from './core/fhir-version.js';

// ─── Core ────────────────────────────────────────────────────
export { TerminologyProvider } from './core/TerminologyProvider.js';
export { TerminologyRegistry } from './core/TerminologyRegistry.js';
export { ASPECTS, MODES, TRANSFORMS, CLINICAL_DOMAINS } from './core/types.js';

// ─── Adapters ────────────────────────────────────────────────
export { SnowstormAdapter } from './adapters/SnowstormAdapter.js';
export { FhirTerminologyAdapter } from './adapters/FhirTerminologyAdapter.js';

// ─── Providers ───────────────────────────────────────────────
export { SnomedCtProvider } from './providers/SnomedCtProvider.js';
export { FhirProvider } from './providers/FhirProvider.js';
export { StaticProvider } from './providers/StaticProvider.js';

// ─── Presets (ready-to-use static providers) ─────────────────
export {
  createIheXdsClassCodeProvider,
  createIheXdsTypeCodeProvider,
  createKdlProvider,
  loadKdlFromFhir
} from './providers/presets/index.js';

// ─── moddle descriptor ───────────────────────────────────────
export { default as TerminologyModdleDescriptor } from './moddle/clinical.json';

// ─── Properties Panel module (for bpmn-js additionalModules) ─
export { default as TerminologyPropertiesPanelModule } from './properties-panel/index.js';

// ─── Helpers ─────────────────────────────────────────────────
export {
  getAnnotations,
  addAnnotation,
  removeAnnotation,
  getAnnotationsContainer,
  ensureAnnotationsContainer,
  ensureExtensionElements
} from './services/AnnotationHelper.js';
