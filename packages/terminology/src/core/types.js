/**
 * @typedef {Object} Concept
 * @property {string} code
 * @property {string} display
 * @property {string} system - CodeSystem URI
 * @property {string} [version]
 * @property {boolean} [active]
 * @property {Record<string, unknown>} [properties] - Provider-specific extras
 */

/**
 * @typedef {Object} SearchResult
 * @property {Concept[]} concepts
 * @property {number} total
 */

/**
 * @typedef {Object} SearchOptions
 * @property {number} [limit]
 * @property {number} [offset]
 * @property {string} [language]
 * @property {boolean} [activeOnly]
 * @property {Record<string, string>} [filter] - Provider-specific filters
 */

/**
 * @typedef {Object} TerminologyCapabilities
 * @property {boolean} search
 * @property {boolean} lookup
 * @property {boolean} hierarchy
 * @property {boolean} validate
 */

/**
 * @typedef {Object} ConnectionConfig
 * @property {string} baseUrl
 * @property {{ type: 'Bearer'|'Basic'|'ApiKey', token?: string, credentials?: string, apiKey?: string, headerName?: string }} [auth]
 * @property {typeof fetch} [fetchFn]
 * @property {number} [timeoutMs]
 * @property {Record<string, string>} [headers]
 */

export const ASPECTS = {
  CLINICAL_CONTENT: 'clinicalContent',
  DOCUMENT_CLASS: 'documentClass',
  DOCUMENT_TYPE: 'documentType',
  NOTE: 'note',
  CONFIDENTIALITY: 'confidentiality',
  STATUS: 'status',
  FORMAT: 'format',
  PARTICIPANT: 'participant'
};

export const MODES = {
  DESCRIPTIVE: 'descriptive',
  PRESCRIPTIVE: 'prescriptive'
};

export const TRANSFORMS = {
  COPY: 'copy',
  FIXED: 'fixed',
  TRANSLATE: 'translate',
  REFERENCE: 'reference'
};

export const CLINICAL_DOMAINS = [
  { id: 'diagnostics', label: 'Diagnostik' },
  { id: 'staging', label: 'Staging' },
  { id: 'therapy', label: 'Therapie' },
  { id: 'follow-up', label: 'Nachsorge' },
  { id: 'palliation', label: 'Palliativversorgung' },
  { id: 'prevention', label: 'Prävention' },
  { id: 'rehabilitation', label: 'Rehabilitation' }
];
