import { describe, it, expect } from 'vitest';
import {
  FHIR_RESOURCE_TYPES,
  INTERACTIONS,
  DIRECTIONS,
  SEMANTIC_ROLES
} from '../../src/core/types.js';

describe('FHIR Mapping types – FHIR_RESOURCE_TYPES', () => {
  it('should expose 16 resource types', () => {
    expect(FHIR_RESOURCE_TYPES).toHaveLength(16);
  });

  it('each entry should have type and label', () => {
    for (const rt of FHIR_RESOURCE_TYPES) {
      expect(rt).toHaveProperty('type');
      expect(rt).toHaveProperty('label');
      expect(typeof rt.type).toBe('string');
      expect(typeof rt.label).toBe('string');
    }
  });

  it('should have unique type values', () => {
    const types = FHIR_RESOURCE_TYPES.map(r => r.type);
    expect(new Set(types).size).toBe(types.length);
  });

  it('should include key clinical resource types', () => {
    const types = FHIR_RESOURCE_TYPES.map(r => r.type);
    expect(types).toContain('Condition');
    expect(types).toContain('Procedure');
    expect(types).toContain('Observation');
    expect(types).toContain('DiagnosticReport');
    expect(types).toContain('DocumentReference');
    expect(types).toContain('MedicationRequest');
    expect(types).toContain('ServiceRequest');
    expect(types).toContain('CarePlan');
    expect(types).toContain('Patient');
    expect(types).toContain('Encounter');
  });
});

describe('FHIR Mapping types – INTERACTIONS', () => {
  it('should expose 5 interaction types', () => {
    expect(INTERACTIONS).toHaveLength(5);
  });

  it('each entry should have value and label', () => {
    for (const i of INTERACTIONS) {
      expect(i).toHaveProperty('value');
      expect(i).toHaveProperty('label');
    }
  });

  it('should include standard FHIR interactions', () => {
    const values = INTERACTIONS.map(i => i.value);
    expect(values).toContain('create');
    expect(values).toContain('read');
    expect(values).toContain('update');
    expect(values).toContain('search');
    expect(values).toContain('transaction');
  });
});

describe('FHIR Mapping types – DIRECTIONS', () => {
  it('should expose 3 direction types', () => {
    expect(DIRECTIONS).toHaveLength(3);
  });

  it('should include input, output, and input-output', () => {
    const values = DIRECTIONS.map(d => d.value);
    expect(values).toContain('input');
    expect(values).toContain('output');
    expect(values).toContain('input-output');
  });
});

describe('FHIR Mapping types – SEMANTIC_ROLES', () => {
  it('should expose 5 semantic roles', () => {
    expect(SEMANTIC_ROLES).toHaveLength(5);
  });

  it('should include all expected roles', () => {
    const values = SEMANTIC_ROLES.map(r => r.value);
    expect(values).toContain('trigger');
    expect(values).toContain('filter');
    expect(values).toContain('classifier');
    expect(values).toContain('identifier');
    expect(values).toContain('payload');
  });

  it('each entry should have value and label', () => {
    for (const r of SEMANTIC_ROLES) {
      expect(r).toHaveProperty('value');
      expect(r).toHaveProperty('label');
      expect(typeof r.value).toBe('string');
      expect(typeof r.label).toBe('string');
    }
  });

  it('should have unique values', () => {
    const values = SEMANTIC_ROLES.map(r => r.value);
    expect(new Set(values).size).toBe(values.length);
  });
});
