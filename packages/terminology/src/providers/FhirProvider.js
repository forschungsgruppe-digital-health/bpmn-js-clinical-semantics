import { TerminologyProvider } from '../core/TerminologyProvider.js';
import { FhirTerminologyAdapter } from '../adapters/FhirTerminologyAdapter.js';

/**
 * Generic provider for any code system hosted on a FHIR Terminology Server.
 * Reusable for LOINC, ICD-10-GM, OPS, ATC, ICD-O-3, etc.
 */
export class FhirProvider extends TerminologyProvider {

  /**
   * @param {Object} config
   * @param {string} config.id - Provider ID (e.g. 'loinc', 'icd-10-gm')
   * @param {string} config.displayName
   * @param {string} config.systemUri
   * @param {string} config.baseUrl - FHIR server base URL
   * @param {number} [config.maxResults=15]
   * @param {string} [config.language]
   * @param {import('../core/types').ConnectionConfig['auth']} [config.auth]
   * @param {typeof fetch} [config.fetchFn]
   */
  constructor(config) {
    super();
    this._id = config.id;
    this._displayName = config.displayName;
    this._systemUri = config.systemUri;
    this._maxResults = config.maxResults || 15;
    this._language = config.language;
    this._adapter = new FhirTerminologyAdapter({
      baseUrl: config.baseUrl,
      systemUri: config.systemUri,
      auth: config.auth,
      fetchFn: config.fetchFn,
      headers: config.headers
    });
  }

  get id() { return this._id; }
  get displayName() { return this._displayName; }
  get systemUri() { return this._systemUri; }
  get capabilities() {
    return { search: true, lookup: true, hierarchy: false, validate: true };
  }

  async search(term, options = {}) {
    return this._adapter.search({
      term,
      limit: options.limit ?? this._maxResults,
      offset: options.offset ?? 0,
      language: options.language ?? this._language
    });
  }

  async lookup(code) {
    return this._adapter.lookup(code);
  }
}
