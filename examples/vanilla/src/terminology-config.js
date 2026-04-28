import {
  TerminologyRegistry,
  FhirProvider,
  FallbackProvider,
  createIheXdsClassCodeProvider,
  createIheXdsTypeCodeProvider,
  createKdlProvider,
  createFhirTerminologyProviderLoader,
  createStaticProviderFromCodeSystem
} from '@bpmn-js-clinical-semantics/terminology';
import hl7V3ActCode from './vendor/hl7-terminology-r4/package/CodeSystem-v3-ActCode.json';
import hl7V3RoleCode from './vendor/hl7-terminology-r4/package/CodeSystem-v3-RoleCode.json';
import hl7V20203 from './vendor/hl7-terminology-r4/package/CodeSystem-v2-0203.json';

const DEFAULT_FHIR_BASE_URL = import.meta.env.VITE_FHIR_BASE_URL || 'https://r4.ontoserver.csiro.au/fhir';
const DEFAULT_SNOMED_FHIR_BASE_URL = import.meta.env.VITE_SNOMED_FHIR_BASE_URL || 'https://snowstorm-training.snomedtools.org/snowstorm/snomed-ct/fhir';

const STATIC_PROVIDER_FACTORIES = [
  createIheXdsClassCodeProvider,
  createIheXdsTypeCodeProvider,
  createKdlProvider
];

const FHIR_PROVIDER_CONFIGS = [
  {
    id: 'snomed-ct',
    displayName: 'SNOMED CT',
    systemUri: 'http://snomed.info/sct',
    valueSetUri: 'http://snomed.info/sct?fhir_vs',
    baseUrl: DEFAULT_SNOMED_FHIR_BASE_URL,
    language: 'en',
    headers: {
      'Accept-Language': 'en'
    }
  },
  {
    id: 'loinc',
    displayName: 'LOINC',
    systemUri: 'http://loinc.org',
    valueSetUri: 'http://loinc.org/vs',
    baseUrl: DEFAULT_FHIR_BASE_URL
  },
  {
    id: 'icd-10-gm',
    displayName: 'ICD-10-GM',
    systemUri: 'http://fhir.de/CodeSystem/bfarm/icd-10-gm',
    valueSetUri: 'http://fhir.de/ValueSet/bfarm/icd-10-gm',
    expandParameters: {
      valueSetVersion: '2020'
    },
    baseUrl: DEFAULT_FHIR_BASE_URL
  },
  {
    id: 'ops',
    displayName: 'OPS',
    systemUri: 'http://fhir.de/CodeSystem/bfarm/ops',
    valueSetUri: 'http://fhir.de/ValueSet/bfarm/ops',
    expandParameters: {
      'system-version': 'http://fhir.de/CodeSystem/bfarm/ops|2021'
    },
    baseUrl: DEFAULT_FHIR_BASE_URL
  }
];

const HL7_PACKAGE_PROVIDER_CONFIGS = [
  {
    id: 'hl7-v3-actcode',
    displayName: 'HL7 v3 ActCode',
    systemUri: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
    valueSetUri: 'http://terminology.hl7.org/ValueSet/v3-ActCode',
    baseUrl: DEFAULT_FHIR_BASE_URL,
    codeSystem: hl7V3ActCode
  },
  {
    id: 'hl7-v3-rolecode',
    displayName: 'HL7 v3 RoleCode',
    systemUri: 'http://terminology.hl7.org/CodeSystem/v3-RoleCode',
    valueSetUri: 'http://terminology.hl7.org/ValueSet/v3-RoleCode',
    baseUrl: DEFAULT_FHIR_BASE_URL,
    codeSystem: hl7V3RoleCode
  },
  {
    id: 'hl7-v2-identifier-type',
    displayName: 'HL7 v2 Identifier Type',
    systemUri: 'http://terminology.hl7.org/CodeSystem/v2-0203',
    valueSetUri: 'http://terminology.hl7.org/ValueSet/v2-0203',
    baseUrl: DEFAULT_FHIR_BASE_URL,
    codeSystem: hl7V20203
  }
];

function createDualTrackProvider(config) {
  const packageProvider = createStaticProviderFromCodeSystem(config.codeSystem, {
    id: `${config.id}-package`,
    displayName: `${config.displayName} (Package)`,
    systemUri: config.systemUri
  });

  const fhirProvider = new FhirProvider(config);

  return new FallbackProvider({
    id: config.id,
    displayName: config.displayName,
    systemUri: config.systemUri,
    primaryProvider: packageProvider,
    fallbackProvider: fhirProvider
  });
}

export function createDemoTerminologyServices() {
  const terminologyRegistry = new TerminologyRegistry();

  STATIC_PROVIDER_FACTORIES
    .map(createProvider => createProvider())
    .forEach(provider => terminologyRegistry.register(provider));

  FHIR_PROVIDER_CONFIGS
    .map(config => new FhirProvider(config))
    .forEach(provider => terminologyRegistry.register(provider));

  HL7_PACKAGE_PROVIDER_CONFIGS
    .map(createDualTrackProvider)
    .forEach(provider => terminologyRegistry.register(provider));

  const terminologyProviderLoader = createFhirTerminologyProviderLoader({
    terminologyRegistry,
    fhirBaseUrl: DEFAULT_FHIR_BASE_URL
  });

  return {
    terminologyRegistry,
    terminologyProviderLoader
  };
}

export function createDemoTerminologyModule(services) {
  return {
    terminologyRegistry: ['value', services.terminologyRegistry],
    terminologyProviderLoader: ['value', services.terminologyProviderLoader]
  };
}
