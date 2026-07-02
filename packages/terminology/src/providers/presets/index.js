import { createPackageCollectionProvider } from '../../services/TerminologyServices.js';

import iheXdsClassCodeSystem from 'de.ihe-d.terminology/CodeSystem-IHEXDSclassCode.json';
import iheXdsTypeCodeSystem from 'de.ihe-d.terminology/CodeSystem-IHEXDStypeCode.json';
import kdlCodeSystem from 'dvmd.kdl.r4/codesystem-kdl.xml.json';

export function loadHl7TerminologyR4CodeSystems() {
  if (typeof import.meta.glob !== 'function') {
    return [];
  }

  const absoluteMatches = Object.values(import.meta.glob(
    '/node_modules/hl7.terminology.r4/CodeSystem-*.json',
    {
      eager: true,
      import: 'default'
    }
  ));

  const localWorkspaceMatches = Object.values(import.meta.glob(
    '../../../node_modules/hl7.terminology.r4/CodeSystem-*.json',
    {
      eager: true,
      import: 'default'
    }
  ));

  const hoistedWorkspaceMatches = Object.values(import.meta.glob(
    '../../../../../node_modules/hl7.terminology.r4/CodeSystem-*.json',
    {
      eager: true,
      import: 'default'
    }
  ));

  const codeSystems = [];
  const seenSystemUris = new Set();

  for (const codeSystem of [
    ...absoluteMatches,
    ...localWorkspaceMatches,
    ...hoistedWorkspaceMatches
  ]) {
    const systemUri = codeSystem?.url || `${codeSystem?.id || ''}`;
    if (!systemUri || seenSystemUris.has(systemUri)) {
      continue;
    }

    seenSystemUris.add(systemUri);
    codeSystems.push(codeSystem);
  }

  return codeSystems;
}

export const DEFAULT_PACKAGE_PROVIDER_IDS = Object.freeze([
  'hl7-terminology-r4-package',
  'ihe-xds-class',
  'ihe-xds-type',
  'kdl'
]);

const PACKAGE_PROVIDER_PRESETS = Object.freeze({
  'hl7-terminology-r4-package': Object.freeze({
    id: 'hl7-terminology-r4-package',
    displayName: 'HL7 Terminology R4 Package',
    resolveCodeSystems: config => config.codeSystems || loadHl7TerminologyR4CodeSystems(),
    returnNullIfEmpty: true
  }),
  'ihe-xds-class': Object.freeze({
    id: 'ihe-xds-class',
    displayName: 'IHE XDS classCode',
    resolveCodeSystems: config => config.codeSystems || [iheXdsClassCodeSystem]
  }),
  'ihe-xds-type': Object.freeze({
    id: 'ihe-xds-type',
    displayName: 'IHE XDS typeCode',
    resolveCodeSystems: config => config.codeSystems || [iheXdsTypeCodeSystem]
  }),
  kdl: Object.freeze({
    id: 'kdl',
    displayName: 'KDL (Klinische Dokumentenklassen-Liste)',
    resolveCodeSystems: config => config.codeSystems || [kdlCodeSystem]
  })
});

export function createPackagePresetProvider(presetId, config = {}) {
  const preset = PACKAGE_PROVIDER_PRESETS[presetId];

  if (!preset) {
    throw new Error(`Unknown package preset "${presetId}".`);
  }

  const codeSystems = preset.resolveCodeSystems(config);

  if (preset.returnNullIfEmpty && !codeSystems.length) {
    return null;
  }

  return createPackageCollectionProvider({
    id: preset.id,
    displayName: preset.displayName,
    ...config,
    codeSystems
  });
}

export function createHl7TerminologyR4PackageProvider(config = {}) {
  return createPackagePresetProvider('hl7-terminology-r4-package', config);
}

export function createIheXdsClassCodeProvider(config = {}) {
  return createPackagePresetProvider('ihe-xds-class', config);
}

export function createIheXdsTypeCodeProvider(config = {}) {
  return createPackagePresetProvider('ihe-xds-type', config);
}

export function createKdlProvider(config = {}) {
  return createPackagePresetProvider('kdl', config);
}
