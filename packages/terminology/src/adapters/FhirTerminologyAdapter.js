/**
 * Adapter for FHIR Terminology Services API.
 * Uses CodeSystem/$lookup and ValueSet/$expand.
 *
 * Reusable for any code system hosted on a FHIR-compliant terminology server
 * (Snowstorm FHIR endpoint, HAPI FHIR, Ontoserver, BfArM FHIR, etc.).
 */
export class FhirTerminologyAdapter {

  /**
   * @param {Object} config
   * @param {string} config.baseUrl - FHIR base URL (e.g. 'https://fhir.bfarm.de/fhir')
   * @param {string} config.systemUri - CodeSystem URI (e.g. 'http://fhir.de/CodeSystem/bfarm/icd-10-gm')
   * @param {import('../core/types').ConnectionConfig['auth']} [config.auth]
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
      const data = await res.json();
      const contains = data.expansion?.contains || [];
      return {
        items: contains.map(c => ({
          code: c.code,
          display: c.display || c.code,
          system: c.system || this._systemUri,
          version: c.version,
          active: !c.inactive
        })),
        total: data.expansion?.total ?? contains.length
      };
    } catch {
      return { items: [], total: 0 };
    }
  }

  /**
   * Lookup via CodeSystem/$lookup.
   */
  async lookup(code) {
    const url = new URL(`${this._baseUrl}/CodeSystem/$lookup`);
    url.searchParams.set('system', this._systemUri);
    url.searchParams.set('code', code);

    try {
      const res = await this._request(url);
      if (!res.ok) return null;
      const data = await res.json();
      const display = data.parameter?.find(p => p.name === 'display')?.valueString;
      const name = data.parameter?.find(p => p.name === 'name')?.valueString;
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

  /** @private */
  async _request(url) {
    const headers = { Accept: 'application/fhir+json', ...this._extraHeaders };
    if (this._auth?.type === 'Bearer') headers['Authorization'] = `Bearer ${this._auth.token}`;
    if (this._auth?.type === 'Basic') headers['Authorization'] = `Basic ${this._auth.credentials}`;
    return this._fetch(url.toString(), { headers });
  }
}
