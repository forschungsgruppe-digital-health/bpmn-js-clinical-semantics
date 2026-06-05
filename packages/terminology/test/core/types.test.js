import { describe, it, expect } from 'vitest';
import { ASPECTS, MODES, TRANSFORMS, CLINICAL_DOMAINS } from '../../src/core/types.js';

describe('types – ASPECTS', () => {
  it('should expose all eight aspect constants', () => {
    expect(Object.keys(ASPECTS)).toHaveLength(8);
    expect(ASPECTS.CLINICAL_CONTENT).toBe('clinicalContent');
    expect(ASPECTS.DOCUMENT_CLASS).toBe('documentClass');
    expect(ASPECTS.DOCUMENT_TYPE).toBe('documentType');
    expect(ASPECTS.NOTE).toBe('note');
    expect(ASPECTS.CONFIDENTIALITY).toBe('confidentiality');
    expect(ASPECTS.STATUS).toBe('status');
    expect(ASPECTS.FORMAT).toBe('format');
    expect(ASPECTS.PARTICIPANT).toBe('participant');
  });

  it('should have unique values', () => {
    const values = Object.values(ASPECTS);
    expect(new Set(values).size).toBe(values.length);
  });
});


describe('types – TRANSFORMS', () => {
  it('should expose all four transform types', () => {
    expect(TRANSFORMS.COPY).toBe('copy');
    expect(TRANSFORMS.FIXED).toBe('fixed');
    expect(TRANSFORMS.TRANSLATE).toBe('translate');
    expect(TRANSFORMS.REFERENCE).toBe('reference');
    expect(Object.keys(TRANSFORMS)).toHaveLength(4);
  });
});

describe('types – CLINICAL_DOMAINS', () => {
  it('should provide seven clinical domains', () => {
    expect(CLINICAL_DOMAINS).toHaveLength(7);
  });

  it('each domain should have id and label', () => {
    for (const domain of CLINICAL_DOMAINS) {
      expect(domain).toHaveProperty('id');
      expect(domain).toHaveProperty('label');
      expect(typeof domain.id).toBe('string');
      expect(typeof domain.label).toBe('string');
    }
  });

  it('should include expected domain IDs', () => {
    const ids = CLINICAL_DOMAINS.map(d => d.id);
    expect(ids).toContain('diagnostics');
    expect(ids).toContain('staging');
    expect(ids).toContain('therapy');
    expect(ids).toContain('follow-up');
    expect(ids).toContain('palliation');
    expect(ids).toContain('prevention');
    expect(ids).toContain('rehabilitation');
  });

  it('should have unique domain IDs', () => {
    const ids = CLINICAL_DOMAINS.map(d => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
