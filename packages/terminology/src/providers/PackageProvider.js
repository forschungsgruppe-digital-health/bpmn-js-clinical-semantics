import { StaticProvider } from './StaticProvider.js';
import { createStaticProviderFromCodeSystem } from '../services/CodeSystemProviderFactory.js';

/**
 * Provider for a FHIR CodeSystem shipped inside an installed package.
 *
 * This behaves like the built-in FHIR and SNOMED providers from the
 * consumer's perspective: it is a first-class TerminologyProvider instance
 * that can be registered in the TerminologyRegistry.
 */
export class PackageProvider extends StaticProvider {

  /**
   * @param {Object} config
   * @param {string} [config.id]
   * @param {string} [config.displayName]
   * @param {string} [config.systemUri]
   * @param {string} [config.version]
   * @param {string} [config.packageName]
   * @param {import('@types/fhir').fhir4.CodeSystem} [config.codeSystem]
   * @param {import('@types/fhir').fhir4.CodeSystem[]} [config.codeSystems]
   */
  constructor(config = {}) {
    if (Array.isArray(config.codeSystems) && config.codeSystems.length > 1) {
      throw new Error('PackageProvider supports exactly one CodeSystem. Use createPackageCollectionProvider for multiple CodeSystem resources.');
    }

    const codeSystem = config.codeSystem || config.codeSystems?.[0];

    if (!codeSystem) {
      throw new Error('PackageProvider requires a CodeSystem resource.');
    }

    if (config.systemUri && config.systemUri !== codeSystem.url) {
      throw new Error('PackageProvider systemUri must match the CodeSystem url.');
    }

    const staticProvider = createStaticProviderFromCodeSystem(codeSystem, {
      id: config.id,
      displayName: config.displayName,
      version: config.version
    });

    super(
      staticProvider.id,
      staticProvider.displayName,
      staticProvider.systemUri,
      staticProvider.getAll(),
      staticProvider.version
    );

    this._packageName = config.packageName;
    this._codeSystem = codeSystem;
  }

  get packageName() {
    return this._packageName;
  }

  get codeSystem() {
    return this._codeSystem;
  }
}
