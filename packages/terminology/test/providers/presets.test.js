import { describe, it, expect, vi } from 'vitest';
import {
  createIheXdsClassCodeProvider,
  createIheXdsTypeCodeProvider,
  createKdlProvider,
  loadKdlFromFhir
} from '../../src/providers/presets/index.js';

describe('Preset: IHE XDS classCode', () => {
  it('should create a valid StaticProvider', () => {
    const provider = createIheXdsClassCodeProvider();
    expect(provider.id).toBe('ihe-xds-class');
    expect(provider.displayName).toBe('IHE XDS classCode');
    expect(provider.systemUri).toBe('http://ihe-d.de/CodeSystems/IHEXDSclassCode');
  });

  it('should contain 16 codes', () => {
    const provider = createIheXdsClassCodeProvider();
    expect(provider.getAll()).toHaveLength(16);
  });

  it('should find Befundberichte by search', async () => {
    const provider = createIheXdsClassCodeProvider();
    const result = await provider.search('Befund');
    expect(result.total).toBeGreaterThan(0);
    expect(result.concepts.some(c => c.code === 'BEF')).toBe(true);
  });

  it('should lookup BEF code', async () => {
    const provider = createIheXdsClassCodeProvider();
    const concept = await provider.lookup('BEF');
    expect(concept).not.toBeNull();
    expect(concept.display).toBe('Befundberichte');
    expect(concept.system).toBe('http://ihe-d.de/CodeSystems/IHEXDSclassCode');
  });

  it('all concepts should have the correct system URI', () => {
    const provider = createIheXdsClassCodeProvider();
    for (const concept of provider.getAll()) {
      expect(concept.system).toBe('http://ihe-d.de/CodeSystems/IHEXDSclassCode');
    }
  });
});

describe('Preset: IHE XDS typeCode', () => {
  it('should create a valid StaticProvider', () => {
    const provider = createIheXdsTypeCodeProvider();
    expect(provider.id).toBe('ihe-xds-type');
    expect(provider.displayName).toBe('IHE XDS typeCode');
    expect(provider.systemUri).toBe('http://ihe-d.de/CodeSystems/IHEXDStypeCode');
  });

  it('should contain 22 codes', () => {
    const provider = createIheXdsTypeCodeProvider();
    expect(provider.getAll()).toHaveLength(22);
  });

  it('should find Laborergebnisse by search', async () => {
    const provider = createIheXdsTypeCodeProvider();
    const result = await provider.search('Labor');
    expect(result.total).toBeGreaterThan(0);
    expect(result.concepts.some(c => c.code === 'LABR')).toBe(true);
  });

  it('all concepts should have the correct system URI', () => {
    const provider = createIheXdsTypeCodeProvider();
    for (const concept of provider.getAll()) {
      expect(concept.system).toBe('http://ihe-d.de/CodeSystems/IHEXDStypeCode');
    }
  });
});

describe('Preset: KDL', () => {
  it('should create with built-in codes by default', () => {
    const provider = createKdlProvider();
    expect(provider.id).toBe('kdl');
    expect(provider.systemUri).toBe('http://dvmd.de/fhir/CodeSystem/kdl');
    expect(provider.getAll()).toHaveLength(18);
  });

  it('should accept custom concepts', () => {
    const custom = [
      { code: 'X1', display: 'Custom One', system: 'http://dvmd.de/fhir/CodeSystem/kdl' }
    ];
    const provider = createKdlProvider(custom);
    expect(provider.getAll()).toHaveLength(1);
    expect(provider.getAll()[0].code).toBe('X1');
  });

  it('should find Arztbrief by search', async () => {
    const provider = createKdlProvider();
    const result = await provider.search('Arztbrief');
    expect(result.total).toBeGreaterThan(0);
    expect(result.concepts[0].code).toBe('AD010101');
  });

  it('should lookup a known KDL code', async () => {
    const provider = createKdlProvider();
    const concept = await provider.lookup('AD010107');
    expect(concept).not.toBeNull();
    expect(concept.display).toBe('Entlassungsbericht');
  });

  it('all built-in concepts should have the correct system URI', () => {
    const provider = createKdlProvider();
    for (const concept of provider.getAll()) {
      expect(concept.system).toBe('http://dvmd.de/fhir/CodeSystem/kdl');
    }
  });
});

describe('loadKdlFromFhir()', () => {
  it('should fetch and parse a FHIR CodeSystem bundle', async () => {
    const mockBundle = {
      entry: [{
        resource: {
          concept: [
            { code: 'AD010101', display: 'Arztbrief' },
            {
              code: 'DG', display: 'Diagnostik',
              concept: [
                { code: 'DG020103', display: 'Laborbefund intern' }
              ]
            }
          ]
        }
      }]
    };

    const mockFetch = vi.fn(async () => ({
      json: async () => mockBundle
    }));

    const provider = await loadKdlFromFhir('https://fhir.example.com', mockFetch);
    expect(provider.id).toBe('kdl');
    expect(provider.getAll()).toHaveLength(3); // AD010101, DG, DG020103 (nested)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('CodeSystem?url=http://dvmd.de/fhir/CodeSystem/kdl'),
      expect.objectContaining({ headers: { Accept: 'application/fhir+json' } })
    );
  });

  it('should throw if CodeSystem not found', async () => {
    const mockFetch = vi.fn(async () => ({
      json: async () => ({ entry: [] })
    }));

    await expect(loadKdlFromFhir('https://fhir.example.com', mockFetch))
      .rejects.toThrow('KDL CodeSystem not found');
  });
});
