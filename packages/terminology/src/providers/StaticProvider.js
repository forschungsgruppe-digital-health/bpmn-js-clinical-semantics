import { TerminologyProvider } from '../core/TerminologyProvider.js';

/**
 * Provider for small, static code systems loaded from memory.
 * No server required. Suitable for IHE XDS codes, KDL, custom value sets.
 */
export class StaticProvider extends TerminologyProvider {

  /**
   * @param {string} id
   * @param {string} displayName
   * @param {string} systemUri
   * @param {import('../core/types').Concept[]} concepts
   */
  constructor(id, displayName, systemUri, concepts) {
    super();
    this._id = id;
    this._displayName = displayName;
    this._systemUri = systemUri;
    this._concepts = concepts;
  }

  get id() { return this._id; }
  get displayName() { return this._displayName; }
  get systemUri() { return this._systemUri; }
  get capabilities() {
    return { search: true, lookup: true, hierarchy: false, validate: true };
  }

  async search(term, options = {}) {
    const lower = term.toLowerCase();
    const matches = this._concepts.filter(c =>
      c.display.toLowerCase().includes(lower) ||
      c.code.toLowerCase().includes(lower)
    );
    const limit = options.limit ?? 20;
    const offset = options.offset ?? 0;
    return {
      concepts: matches.slice(offset, offset + limit),
      total: matches.length
    };
  }

  async lookup(code) {
    return this._concepts.find(c => c.code === code) ?? null;
  }

  async validate(code) {
    const concept = this._concepts.find(c => c.code === code) ?? null;
    return {
      valid: concept !== null && concept.active !== false,
      message: concept ? undefined : `Code ${code} not found in ${this._id}`
    };
  }

  /** Get all concepts (useful for dropdowns). */
  getAll() {
    return [...this._concepts];
  }
}
