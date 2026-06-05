import {
  createIheXdsClassCodeProvider,
  createIheXdsTypeCodeProvider,
  createKdlProvider,
  createPackageCollectionProvider,
  createTerminologyModule,
  createTerminologyServices
} from '@bpmn-js-clinical-semantics/terminology';

const HL7_PACKAGE_CODE_SYSTEMS = Object.values(import.meta.glob(
  '../../../node_modules/hl7.terminology.r4/CodeSystem-*.json',
  {
    eager: true,
    import: 'default'
  }
));

const DEFAULT_FHIR_BASE_URL = import.meta.env.VITE_FHIR_BASE_URL || 'https://r4.ontoserver.csiro.au/fhir';

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
    baseUrl: DEFAULT_FHIR_BASE_URL
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
  },
  {
    id: 'atc',
    displayName: 'ATC',
    systemUri: 'http://www.whocc.no/atc',
    valueSetUri: 'http://www.whocc.no/atc/vs',
    expandParameters: {
      valueSetVersion: '2025.0.0'
    },
    lookupParameters: {
      version: '2025.0.0'
    },
    baseUrl: DEFAULT_FHIR_BASE_URL
  }
];

export function createDemoTerminologyServices() {
  return createTerminologyServices({
    staticProviderFactories: STATIC_PROVIDER_FACTORIES,
    fhirProviders: FHIR_PROVIDER_CONFIGS,
    providers: [
      createPackageCollectionProvider({
        id: 'hl7-terminology-r4-package',
        displayName: 'HL7 Terminology R4 Package',
        codeSystems: HL7_PACKAGE_CODE_SYSTEMS
      })
    ],
    loaderConfig: {
      fhirBaseUrl: DEFAULT_FHIR_BASE_URL
    }
  });
}

export function createDemoTerminologyModule(services) {
  return createTerminologyModule(services);
}
