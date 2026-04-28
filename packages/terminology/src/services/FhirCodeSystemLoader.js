import { FhirProvider } from '../providers/FhirProvider.js';

/**
 * Load any CodeSystem dynamically from a FHIR R4 server.
 * Ideal for integrating dynamic hl7.terminology.r4 resources.
 *
 * @param {string} systemUrl - The URI of the CodeSystem (e.g. 'http://terminology.hl7.org/CodeSystem/v3-ActCode')
 * @param {string} fhirBaseUrl - FHIR R4 server base URL
 * @param {typeof fetch} [fetchFn] - Custom fetch function
 * @returns {Promise<FhirProvider>}
 */
export async function loadCodeSystemFromFhir(systemUrl, fhirBaseUrl, fetchFn) {
  const _fetch = fetchFn || globalThis.fetch.bind(globalThis);
  let displayName = systemUrl.split('/').pop();

  try {
    const res = await _fetch(
      `${fhirBaseUrl}/CodeSystem?url=${encodeURIComponent(systemUrl)}`,
      { headers: { Accept: 'application/fhir+json' } }
    );
    if (res.ok) {
      const bundle = await res.json();
      const cs = bundle.entry?.[0]?.resource;
      if (cs && (cs.title || cs.name)) {
        displayName = cs.title || cs.name;
      }
    }
  } catch (err) {
    console.warn(`Konnte Metadaten für ${systemUrl} nicht abrufen. Nutze Fallback.`);
  }

  let valueSetUri = systemUrl;
  if (systemUrl.startsWith('http://terminology.hl7.org/CodeSystem/')) {
    valueSetUri = systemUrl.replace('/CodeSystem/', '/ValueSet/');
  }

  return new FhirProvider({
    id: `dyn-${displayName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
    displayName,
    systemUri: systemUrl,
    valueSetUri,
    baseUrl: fhirBaseUrl
  });
}
