import { describe, it, expect } from 'vitest';

/**
 * Tests that the core (non-UI) exports of the fhir-mapping package are
 * importable and well-defined. Properties-panel modules are excluded
 * because they depend on bpmn-js peer dependencies that may not be
 * resolved in a pure unit-test environment.
 */

describe('@bpmn-js-clinical-semantics/fhir-mapping – core exports', () => {
  it('should export FHIR type constants', async () => {
    const mod = await import('../src/core/types.js');
    expect(mod.FHIR_RESOURCE_TYPES).toBeDefined();
    expect(mod.INTERACTIONS).toBeDefined();
    expect(mod.DIRECTIONS).toBeDefined();
    expect(mod.SEMANTIC_ROLES).toBeDefined();
  });

  it('should export MappingHelper functions', async () => {
    const mod = await import('../src/services/MappingHelper.js');
    expect(mod.getResourceMappings).toBeDefined();
    expect(mod.addResourceMapping).toBeDefined();
    expect(mod.removeResourceMapping).toBeDefined();
    expect(mod.exportMappingsAsJson).toBeDefined();
  });

  it('should export moddle descriptor as JSON', async () => {
    const { default: descriptor } = await import('../src/moddle/fhir-mapping.json');
    expect(descriptor.name).toBe('FhirMapping');
    expect(descriptor.prefix).toBe('fhirmap');
    expect(descriptor.uri).toBe('https://clinical-bpmn.org/fhir-mapping/v1');
    expect(descriptor.types.length).toBeGreaterThan(0);
  });
});
