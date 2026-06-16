import { describe, expect, it } from 'vitest';
import { PackageProvider } from '../../src/providers/PackageProvider.js';

const codeSystem = {
  resourceType: 'CodeSystem',
  id: 'v3-ActCode',
  url: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
  version: '4.0.0',
  title: 'HL7 v3 ActCode',
  concept: [
    { code: 'AA', display: 'Adjudicated with adjustments' }
  ]
};

describe('PackageProvider', () => {
  it('should behave like a first-class terminology provider', async () => {
    const provider = new PackageProvider({
      id: 'hl7-v3-actcode',
      displayName: 'HL7 v3 ActCode',
      packageName: 'hl7.terminology.r4',
      codeSystem
    });

    expect(provider.id).toBe('hl7-v3-actcode');
    expect(provider.displayName).toBe('HL7 v3 ActCode');
    expect(provider.systemUri).toBe('http://terminology.hl7.org/CodeSystem/v3-ActCode');
    expect(provider.packageName).toBe('hl7.terminology.r4');

    await expect(provider.lookup('AA')).resolves.toMatchObject({
      code: 'AA',
      system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode'
    });
  });

  it('should keep the CodeSystem URI and allow a version override', () => {
    const provider = new PackageProvider({
      id: 'hl7-v3-actcode',
      displayName: 'HL7 v3 ActCode',
      version: '7.1.0',
      codeSystem
    });

    expect(provider.systemUri).toBe('http://terminology.hl7.org/CodeSystem/v3-ActCode');
    expect(provider.version).toBe('7.1.0');
  });

  it('should reject multiple CodeSystems', () => {
    expect(() => new PackageProvider({
      id: 'hl7-package',
      displayName: 'HL7 Terminology',
      codeSystems: [codeSystem, codeSystem]
    })).toThrow('one CodeSystem');
  });

  it('should reject a mismatched system URI', () => {
    expect(() => new PackageProvider({
      id: 'hl7-v3-actcode',
      displayName: 'HL7 v3 ActCode',
      systemUri: 'package:hl7.terminology.r4',
      codeSystem
    })).toThrow('must match the CodeSystem url');
  });
});
