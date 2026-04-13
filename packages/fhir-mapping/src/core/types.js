export const FHIR_RESOURCE_TYPES = [
  { type: 'Condition', label: 'Condition (Diagnose)' },
  { type: 'Procedure', label: 'Procedure (Prozedur)' },
  { type: 'Observation', label: 'Observation (Befund/Messwert)' },
  { type: 'DiagnosticReport', label: 'DiagnosticReport (Befundbericht)' },
  { type: 'DocumentReference', label: 'DocumentReference (Dokument)' },
  { type: 'MedicationRequest', label: 'MedicationRequest (Medikation)' },
  { type: 'MedicationAdministration', label: 'MedicationAdministration' },
  { type: 'ServiceRequest', label: 'ServiceRequest (Anforderung)' },
  { type: 'CarePlan', label: 'CarePlan (Behandlungsplan)' },
  { type: 'Composition', label: 'Composition (Dokument-Composition)' },
  { type: 'Bundle', label: 'Bundle (Nachricht/Transaktion)' },
  { type: 'ImagingStudy', label: 'ImagingStudy (Bildgebung)' },
  { type: 'Consent', label: 'Consent (Einwilligung)' },
  { type: 'Patient', label: 'Patient' },
  { type: 'Encounter', label: 'Encounter (Fall/Kontakt)' },
  { type: 'Specimen', label: 'Specimen (Probe)' }
];

export const INTERACTIONS = [
  { value: 'create', label: 'create (erzeugen)' },
  { value: 'read', label: 'read (lesen)' },
  { value: 'update', label: 'update (aktualisieren)' },
  { value: 'search', label: 'search (suchen)' },
  { value: 'transaction', label: 'transaction (Bündel)' }
];

export const DIRECTIONS = [
  { value: 'input', label: 'Input (konsumiert)' },
  { value: 'output', label: 'Output (erzeugt)' },
  { value: 'input-output', label: 'Input-Output (beides)' }
];

export const SEMANTIC_ROLES = [
  { value: 'trigger', label: 'Trigger (löst Prozessschritt aus)' },
  { value: 'filter', label: 'Filter (Selektionskriterium)' },
  { value: 'classifier', label: 'Classifier (Typisierung)' },
  { value: 'identifier', label: 'Identifier (Identifikation)' },
  { value: 'payload', label: 'Payload (Kerninhalt)' }
];
