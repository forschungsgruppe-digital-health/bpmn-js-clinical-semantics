import { describe, expect, it } from 'vitest';
import {
  createPackageCollectionProvider,
  createPackageFallbackProvider,
  createPackageTerminologyProvider,
  createTerminologyModule,
  createTerminologyServices
} from '../../src/services/TerminologyServices.js';
import {
  createDefaultPackageProviders,
  createDefaultTerminologyServices
} from '../../src/config/terminology-config.js';

const actCodeCodeSystem = {
  resourceType: 'CodeSystem',
  id: 'v3-ActCode',
  url: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
  title: 'HL7 v3 ActCode',
  concept: [
    { code: 'AA', display: 'Adjudicated with adjustments' }
  ]
};

describe('TerminologyServices', () => {
  it('should create a package-backed static provider', async () => {
    const provider = createPackageTerminologyProvider({
      id: 'hl7-v3-actcode',
      displayName: 'HL7 v3 ActCode',
      systemUri: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
      codeSystem: actCodeCodeSystem
    });

    expect(provider.id).toBe('hl7-v3-actcode');
    await expect(provider.lookup('AA')).resolves.toMatchObject({
      code: 'AA',
      system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode'
    });
  });

  it('should create a dual-track package/fhir fallback provider', async () => {
    const provider = createPackageFallbackProvider({
      id: 'hl7-v3-actcode',
      displayName: 'HL7 v3 ActCode',
      systemUri: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
      codeSystem: actCodeCodeSystem,
      fallbackFhirConfig: {
        id: 'hl7-v3-actcode-fhir',
        displayName: 'HL7 v3 ActCode (FHIR)',
        systemUri: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
        valueSetUri: 'http://terminology.hl7.org/ValueSet/v3-ActCode',
        baseUrl: 'https://fhir.example.com'
      }
    });

    expect(provider.id).toBe('hl7-v3-actcode');
    await expect(provider.lookup('AA')).resolves.toMatchObject({
      code: 'AA',
      system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode'
    });
  });

  it('should create one aggregate provider from many package CodeSystems', async () => {
    const provider = createPackageCollectionProvider({
      id: 'hl7-package',
      displayName: 'HL7 Terminology (Package)',
      codeSystems: [
        actCodeCodeSystem,
        {
          resourceType: 'CodeSystem',
          id: 'v2-0203',
          url: 'http://terminology.hl7.org/CodeSystem/v2-0203',
          concept: [
            { code: 'MR', display: 'Medical record number' }
          ]
        }
      ]
    });

    const result = await provider.search('medical');

    expect(provider.systemUri).toBe('package:hl7-package');
    expect(result.total).toBe(1);
    expect(result.concepts[0]).toMatchObject({
      code: 'MR',
      system: 'http://terminology.hl7.org/CodeSystem/v2-0203'
    });
  });

  it('should create registry and loader services from configuration', () => {
    const services = createTerminologyServices({
      packageProviders: [
        {
          id: 'hl7-v3-actcode',
          displayName: 'HL7 v3 ActCode',
          systemUri: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
          codeSystem: actCodeCodeSystem,
          fallbackFhirConfig: {
            systemUri: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
            valueSetUri: 'http://terminology.hl7.org/ValueSet/v3-ActCode',
            baseUrl: 'https://fhir.example.com'
          }
        }
      ],
      loaderConfig: {
        fhirBaseUrl: 'https://fhir.example.com'
      }
    });

    expect(services.terminologyRegistry.getProvider('hl7-v3-actcode')).toBeDefined();
    expect(services.terminologyProviderLoader).toBeDefined();
  });

  it('should expose terminology services as a bpmn-js module', () => {
    const services = createTerminologyServices({
      loaderConfig: false
    });

    expect(createTerminologyModule(services)).toEqual({
      terminologyRegistry: ['value', services.terminologyRegistry]
    });
  });

  it('should create default services with built-in providers', () => {
    const services = createDefaultTerminologyServices({
      enablePackageDefaults: false,
      loaderConfig: false
    });

    const providerIds = services.terminologyRegistry.listProviders().map(provider => provider.id);

    expect(providerIds).toEqual(expect.arrayContaining([
      'snomed-ct',
      'loinc',
      'icd-10-gm',
      'ops',
      'atc'
    ]));
  });

  it('should allow disabling defaults by provider id', () => {
    const services = createDefaultTerminologyServices({
      enablePackageDefaults: false,
      loaderConfig: false,
      disabledProviderIds: ['atc', 'snomed-ct']
    });

    const providerIds = services.terminologyRegistry.listProviders().map(provider => provider.id);

    expect(providerIds).not.toContain('atc');
    expect(providerIds).not.toContain('snomed-ct');
    expect(providerIds).toContain('loinc');
  });

  it('should apply package provider overrides by id', () => {
    const providers = createDefaultPackageProviders({
      packageProviderOptions: {
        kdl: {
          displayName: 'KDL Custom'
        }
      }
    });

    const providerIds = providers.map(provider => provider.id);
    const kdlProvider = providers.find(provider => provider.id === 'kdl');

    expect(providerIds).toContain('kdl');
    expect(kdlProvider.displayName).toBe('KDL Custom');
  });
});
