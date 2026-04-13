/**
 * Adapter for FHIR Terminology Services API.
 * Uses CodeSystem/$lookup and ValueSet/$expand (FHIR R4).
 *
 * Reusable for any code system hosted on a FHIR-compliant terminology server
 * (Snowstorm FHIR endpoint, HAPI FHIR, Ontoserver, BfArM FHIR, etc.).
 *
 * FHIR R4 types from @types/fhir are used for JSDoc annotations.
 * When migrating to R5, update fhir4.* references to fhir5.*.
 *
 * @module FhirTerminologyAdapter
 */

import { FHIR_MIME_TYPE } from '../core/fhir-version.js';

/**
 * @typedef {import('@types/fhir').fhir4.ValueSet} FhirValueSet
 * @typedef {import('@types/fhir').fhir4.ValueSetExpansionContains} FhirValueSetExpansionContains
 * @typedef {import('@types/fhir').fhir4.Parameters} FhirParameters
 * @typedef {import('@types/fhir').fhir4.ParametersParameter} FhirParametersParameter
 * @typedef {import('../core/types').Concept} Concept
 * @typedef {import('../core/types').ConnectionConfig} ConnectionConfig
 */

export class FhirTerminologyAdapter {

  /**
   * @param {Object} config
   * @param {string} config.baseUrl - FHIR base URL (e.g. 'https://fhir.bfarm.de/fhir')
   * @param {string} config.systemUri - CodeSystem URI (e.g. 'http://fhir.de/CodeSystem/bfarm/icd-10-gm')
   * @param {ConnectionConfig['auth']} [config.auth]
   * @param {typeof fetch} [config.fetchFn]
   * @param {Record<string, string>} [config.headers]
   */
  constructor(config) {
    this._baseUrl = config.baseUrl.replace(/\/$/, '');
    this._systemUri = config.systemUri;
    this._auth = config.auth;
    this._fetch = config.fetchFn || globalThis.fetch.bind(globalThis);
    this._extraHeaders = config.headers || {};
  }

  /**
   * Search via ValueSet/$expand with filter parameter.
   *
   * The response is a FHIR R4 ValueSet with an expansion containing
   * matching concepts. Each entry in expansion.contains is a
   * {@link FhirValueSetExpansionContains} which we map to our internal
   * {@link Concept} type.
   *
   * @param {{ term: string, limit: number, offset: number, language?: string }} params
   * @returns {Promise<{ items: Concept[], total: number }>}
   */
  async search(params) {
    const url = new URL(`${this._baseUrl}/ValueSet/$expand`);
    url.searchParams.set('url', `${this._systemUri}?vs`);
    url.searchParams.set('filter', params.term);
    url.searchParams.set('count', String(params.limit));
    url.searchParams.set('offset', String(params.offset));

    if (params.language) {
      url.searchParams.set('displayLanguage', params.language);
    }

    try {
      const res = await this._request(url);
      if (!res.ok) return { items: [], total: 0 };

      /** @type {FhirValueSet} */
      const data = await res.json();

      /** @type {FhirValueSetExpansionContains[]} */
      const contains = data.expansion?.contains || [];

      return {
        items: contains.map(c => this._mapExpandContainsToConcept(c)),
        total: data.expansion?.total ?? contains.length
      };
    } catch {
      return { items: [], total: 0 };
    }
  }

  /**
   * Lookup via CodeSystem/$lookup.
   *
   * The response is a FHIR R4 Parameters resource containing the
   * display name and other properties of the requested code.
   *
   * @param {string} code
   * @returns {Promise<Concept | null>}
   */
  async lookup(code) {
    const url = new URL(`${this._baseUrl}/CodeSystem/$lookup`);
    url.searchParams.set('system', this._systemUri);
    url.searchParams.set('code', code);

    try {
      const res = await this._request(url);
      if (!res.ok) return null;

      /** @type {FhirParameters} */
      const data = await res.json();

      const display = this._getParameterValue(data, 'display');
      const name = this._getParameterValue(data, 'name');

      return {
        code,
        display: display || name || code,
        system: this._systemUri,
        active: true
      };
    } catch {
      return null;
    }
  }

  /**
   * Map a FHIR ValueSet expansion entry to our internal Concept type.
   *
   * @param {FhirValueSetExpansionContains} entry
   * @returns {Concept}
   * @private
   */
  _mapExpandContainsToConcept(entry) {
    return {
      code: entry.code || '',
      display: entry.display || entry.code || '',
      system: entry.system || this._systemUri,
      version: entry.version,
      active: !entry.inactive
    };
  }

  /**
   * Extract a string value from a FHIR Parameters resource by parameter name.
   *
   * @param {FhirParameters} params - The Parameters resource
   * @param {string} name - Parameter name to find
   * @returns {string | undefined}
   * @private
   */
  _getParameterValue(params, name) {
    /** @type {FhirParametersParameter | undefined} */
    const param = params.parameter?.find(p => p.name === name);
    return param?.valueString;
  }

  /**
   * Perform an authenticated FHIR HTTP request.
   *
   * @param {URL} url
   * @returns {Promise<Response>}
   * @private
   */
  async _request(url) {
    const headers = { Accept: FHIR_MIME_TYPE, ...this._extraHeaders };
    if (this._auth?.type === 'Bearer') headers['Authorization'] = `Bearer ${this._auth.token}`;
    if (this._auth?.type === 'Basic') headers['Authorization'] = `Basic ${this._auth.credentials}`;
    return this._fetch(url.toString(), { headers });
  }
}
