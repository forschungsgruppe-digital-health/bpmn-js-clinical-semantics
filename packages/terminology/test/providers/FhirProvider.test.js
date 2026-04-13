import { describe, it, expect, vi } from 'vitest';
import { FhirProvider } from '../../src/providers/FhirProvider.js';

function createMockFetch(responseBody, ok = true) {
  return vi.fn(async () => ({
    ok,
    json: async () => responseBody
  }));
}

describe('FhirProvider', () => {
  function createProvider(overrides = {}) {
    return new FhirProvider({
      id: 'icd-10-gm',
      displayName: 'ICD-10-GM',
      systemUri: 'http://fhir.de/CodeSystem/bfarm/icd-10-gm',
      baseUrl: 'https://fhir.bfarm.de/fhir',
      fetchFn: overrides.fetchFn ?? createMockFetch({ expansion: { contains: [] } }),
      ...overrides
    });
  }

  it('should have correct identity', () => {
    const provider = createProvider();
    expect(provider.id).toBe('icd-10-gm');
    expect(provider.displayName).toBe('ICD-10-GM');
    expect(provider.systemUri).toBe('http://fhir.de/CodeSystem/bfarm/icd-10-gm');
  });

  it('should declare search, lookup, validate capabilities', () => {
    const provider = createProvider();
    expect(provider.capabilities).toEqual({
      search: true, lookup: true, hierarchy: false, validate: true
    });
  });

  describe('search()', () => {
    it('should delegate to FhirTerminologyAdapter', async () => {
      const fetchFn = createMockFetch({
        expansion: {
          contains: [
            { code: 'C34.1', display: 'Oberlappen', system: 'http://fhir.de/CodeSystem/bfarm/icd-10-gm' }
          ],
          total: 1
        }
      });
      const provider = createProvider({ fetchFn });

      const result = await provider.search('Lunge', { limit: 5 });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].code).toBe('C34.1');
    });

    it('should respect maxResults config', async () => {
      const fetchFn = createMockFetch({ expansion: { contains: [] } });
      const provider = createProvider({ maxResults: 25, fetchFn });

      await provider.search('test');
      const calledUrl = new URL(fetchFn.mock.calls[0][0]);
      expect(calledUrl.searchParams.get('count')).toBe('25');
    });

    it('should override maxResults with options.limit', async () => {
      const fetchFn = createMockFetch({ expansion: { contains: [] } });
      const provider = createProvider({ maxResults: 25, fetchFn });

      await provider.search('test', { limit: 3 });
      const calledUrl = new URL(fetchFn.mock.calls[0][0]);
      expect(calledUrl.searchParams.get('count')).toBe('3');
    });
  });

  describe('lookup()', () => {
    it('should delegate to FhirTerminologyAdapter', async () => {
      const fetchFn = createMockFetch({
        parameter: [
          { name: 'display', valueString: 'Bösartige Neubildung' }
        ]
      });
      const provider = createProvider({ fetchFn });

      const concept = await provider.lookup('C34.1');
      expect(concept.code).toBe('C34.1');
      expect(concept.display).toBe('Bösartige Neubildung');
    });
  });
});
