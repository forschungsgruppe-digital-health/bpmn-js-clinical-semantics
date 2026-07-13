import {
  createDefaultTerminologyServices
} from '@forschungsgruppe-digital-health/terminology';

const DEFAULT_FHIR_BASE_URL = import.meta.env.VITE_FHIR_BASE_URL || 'https://r4.ontoserver.csiro.au/fhir';
const DEFAULT_SNOWSTORM_BASE_URL = import.meta.env.VITE_SNOWSTORM_BASE_URL || 'https://snowstorm-training.snomedtools.org/snowstorm/snomed-ct';
export function createDemoTerminologyServices() {
  return createDefaultTerminologyServices({
    serverConfig: {
      fhirBaseUrl: DEFAULT_FHIR_BASE_URL,
      snowstormBaseUrl: DEFAULT_SNOWSTORM_BASE_URL
    },
  });
}
