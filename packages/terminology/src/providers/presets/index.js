/**
 * Ready-to-use terminology provider presets for common clinical code systems.
 *
 * FHIR R4 types from @types/fhir are used for JSDoc annotations.
 * When migrating to R5, update fhir4.* references to fhir5.*.
 *
 * @module presets
 */

import { StaticProvider } from '../StaticProvider.js';
export { loadCodeSystemFromFhir } from '../../services/FhirCodeSystemLoader.js';

/**
 * @typedef {import('@types/fhir').fhir4.Bundle} FhirBundle
 * @typedef {import('@types/fhir').fhir4.CodeSystem} FhirCodeSystem
 * @typedef {import('@types/fhir').fhir4.CodeSystemConcept} FhirCodeSystemConcept
 * @typedef {import('../../core/types').Concept} Concept
 */

// ─── IHE XDS classCode ──────────────────────────────────────

const IHE_XDS_CLASS_CODES = [
  { code: 'ADM', display: 'Administratives Dokument' },
  { code: 'ANF', display: 'Anforderung' },
  { code: 'ASM', display: 'Assessment' },
  { code: 'BEF', display: 'Befundberichte' },
  { code: 'BIL', display: 'Bilddaten' },
  { code: 'BRI', display: 'Briefe' },
  { code: 'DOK', display: 'Dokumente ohne besondere Form (Notizen)' },
  { code: 'DUR', display: 'Durchführungsprotokoll' },
  { code: 'FOR', display: 'Forschung' },
  { code: 'GUT', display: 'Gutachten und Qualitätsmanagement' },
  { code: 'LAB', display: 'Laborergebnisse' },
  { code: 'AUS', display: 'Medizinischer Ausweis' },
  { code: 'PLA', display: 'Planungsdokument' },
  { code: 'VER', display: 'Verordnung' },
  { code: 'VID', display: 'Videodaten' },
  { code: 'MED', display: 'Medikation' }
].map(c => ({ ...c, system: 'http://ihe-d.de/CodeSystems/IHEXDSclassCode' }));

export function createIheXdsClassCodeProvider() {
  return new StaticProvider(
    'ihe-xds-class',
    'IHE XDS classCode',
    'http://ihe-d.de/CodeSystems/IHEXDSclassCode',
    IHE_XDS_CLASS_CODES
  );
}

// ─── IHE XDS typeCode ────────────────────────────────────────

const IHE_XDS_TYPE_CODES = [
  { code: 'ABRE', display: 'Abrechnungsdokument' },
  { code: 'ADCH', display: 'Administrative Checkliste' },
  { code: 'ANAE', display: 'Anästhesiedokumentation' },
  { code: 'BERI', display: 'Arztberichte' },
  { code: 'BESC', display: 'Ärztliche Bescheinigungen' },
  { code: 'EINW', display: 'Einwilligungen/Aufklärungen' },
  { code: 'ENTE', display: 'Entlassdokumente' },
  { code: 'ERGE', display: 'Ergebnisse bildgebender Diagnostik' },
  { code: 'FALL', display: 'Fallbesprechungen' },
  { code: 'FUNK', display: 'Ergebnisse Funktionsdiagnostik' },
  { code: 'GGEV', display: 'Geburtsgeburtsvorbereitungsdokumentation' },
  { code: 'KOFU', display: 'Konsil' },
  { code: 'LABR', display: 'Laborergebnisse' },
  { code: 'MEDI', display: 'Medikamentöse Therapie' },
  { code: 'MIKR', display: 'Ergebnisse Mikrobiologie' },
  { code: 'OPDK', display: 'OP-Dokumente' },
  { code: 'PATH', display: 'Pathologiebefundberichte' },
  { code: 'PFLE', display: 'Pflegedokumentation' },
  { code: 'QUAL', display: 'Qualitätssicherung' },
  { code: 'STRA', display: 'Strahlentherapiedokumentation' },
  { code: 'TRFU', display: 'Transfusionsdokumentation' },
  { code: 'VERO', display: 'Verordnungen' }
].map(c => ({ ...c, system: 'http://ihe-d.de/CodeSystems/IHEXDStypeCode' }));

export function createIheXdsTypeCodeProvider() {
  return new StaticProvider(
    'ihe-xds-type',
    'IHE XDS typeCode',
    'http://ihe-d.de/CodeSystems/IHEXDStypeCode',
    IHE_XDS_TYPE_CODES
  );
}

// ─── KDL (DVMD Klinische Dokumentenklassen-Liste) ────────────

const KDL_CODES = [
  { code: 'AD010101', display: 'Arztbrief' },
  { code: 'AD010102', display: 'Durchgangsarztbericht' },
  { code: 'AD010103', display: 'Konsilbericht intern' },
  { code: 'AD010104', display: 'Konsilbericht extern' },
  { code: 'AD010107', display: 'Entlassungsbericht' },
  { code: 'AD010108', display: 'OP-Bericht' },
  { code: 'AD020105', display: 'Laborbefund extern' },
  { code: 'AD020106', display: 'Wiedereingliederungsplan' },
  { code: 'AD060101', display: 'Konsilanforderung' },
  { code: 'AD060108', display: 'Anordnung/Verordnung' },
  { code: 'DG020103', display: 'Laborbefund intern' },
  { code: 'DG020106', display: 'Ergebnis bildgebender Diagnostik' },
  { code: 'DG020110', display: 'Pathologiebefundbericht' },
  { code: 'DG020112', display: 'Ergebnis Funktionsdiagnostik' },
  { code: 'SD160103', display: 'Psychiatrisch-psychotherapeutische Therapieanordnung' },
  { code: 'SD160107', display: 'Tumorkonferenzprotokoll' },
  { code: 'VL160101', display: 'Verlaufsdokumentation ärztlich' },
  { code: 'VL160105', display: 'Pflegebericht' }
].map(c => ({ ...c, system: 'http://dvmd.de/fhir/CodeSystem/kdl' }));

export function createKdlProvider(concepts) {
  return new StaticProvider(
    'kdl',
    'KDL (Klinische Dokumentenklassen-Liste)',
    'http://dvmd.de/fhir/CodeSystem/kdl',
    concepts || KDL_CODES
  );
}

/**
 * Load the full KDL CodeSystem from a FHIR R4 server.
 * Use this when the built-in subset is insufficient.
 *
 * The function fetches a FHIR R4 Bundle containing the KDL CodeSystem
 * resource and recursively extracts all concepts.
 *
 * @param {string} fhirBaseUrl - FHIR R4 server base URL
 * @param {typeof fetch} [fetchFn] - Custom fetch function (for testing)
 * @returns {Promise<StaticProvider>} A StaticProvider with the full KDL code set
 */
export async function loadKdlFromFhir(fhirBaseUrl, fetchFn) {
  const _fetch = fetchFn || globalThis.fetch.bind(globalThis);
  const res = await _fetch(
    `${fhirBaseUrl}/CodeSystem?url=http://dvmd.de/fhir/CodeSystem/kdl`,
    { headers: { Accept: 'application/fhir+json' } }
  );

  /** @type {FhirBundle} */
  const bundle = await res.json();

  /** @type {FhirCodeSystem | undefined} */
  const cs = /** @type {FhirCodeSystem} */ (bundle.entry?.[0]?.resource);
  if (!cs?.concept) throw new Error('KDL CodeSystem not found');

  /** @type {Concept[]} */
  const concepts = [];

  /**
   * Recursively extract concepts from the CodeSystem hierarchy.
   * @param {FhirCodeSystemConcept[]} items
   */
  function extract(items) {
    for (const item of items) {
      if (item.code && item.display) {
        concepts.push({ code: item.code, display: item.display, system: 'http://dvmd.de/fhir/CodeSystem/kdl' });
      }
      if (item.concept) extract(item.concept);
    }
  }
  extract(cs.concept);
  return createKdlProvider(concepts);
}
