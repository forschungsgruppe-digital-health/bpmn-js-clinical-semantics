import { html } from 'htm/preact';
import { useRef, useState } from '@bpmn-io/properties-panel/preact/hooks';
import { useService } from 'bpmn-js-properties-panel';
import {
  getAnnotations,
  addAnnotation,
  removeAnnotation
} from '../../services/AnnotationHelper.js';

const ASPECTS = [
  { value: 'clinicalContent', label: 'Klinischer Inhalt' },
  { value: 'documentClass', label: 'Dokumentklasse (IHE XDS classCode)' },
  { value: 'documentType', label: 'Dokumenttyp (IHE XDS typeCode / KDL)' },
  { value: 'note', label: 'Freitext-Notiz' }
];

const MODES = [
  { value: 'descriptive', label: 'Deskriptiv (beschreibend)' },
  { value: 'prescriptive', label: 'Präskriptiv (normgebend)' }
];

const TRANSFORMS = [
  { value: '', label: '– kein Target –' },
  { value: 'copy', label: 'copy (Code → Ziel)' },
  { value: 'fixed', label: 'fixed (fester Wert)' },
  { value: 'translate', label: 'translate (ConceptMap)' }
];

export function AnnotationListEntry(props) {
  const { element } = props;
  const moddle = useService('moddle');
  const modeling = useService('modeling');
  const translate = useService('translate');
  const terminologyRegistry = useService('terminologyRegistry', false);
  const terminologyProviderLoader = useService('terminologyProviderLoader', false);

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(createEmptyForm());
  const [, setRefresh] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [activeSearchResultIndex, setActiveSearchResultIndex] = useState(-1);
  const [selectedProviderId, setSelectedProviderId] = useState('');
  const searchRequestSequence = useRef(0);

  const bo = element.businessObject;
  const annotations = getAnnotations(bo);

  function createEmptyForm() {
    return {
      aspect: 'clinicalContent',
      mode: 'descriptive',
      text: '',
      codingSystem: '',
      codingCode: '',
      codingDisplay: '',
      targetElement: '',
      targetTransform: '',
      targetValue: ''
    };
  }

  function normalizeConcepts(result) {
    const concepts = result?.concepts || result?.items || [];
    return Array.isArray(concepts) ? concepts : [];
  }

  function getRegisteredProviders() {
    return terminologyRegistry ? terminologyRegistry.listProviders() : [];
  }

  function getSelectedProvider() {
    return getRegisteredProviders().find(provider => provider.id === selectedProviderId) || null;
  }

  async function resolveProviderId(providerId) {
    if (providerId) {
      return providerId;
    }

    const selectedProvider = getSelectedProvider();

    if (selectedProvider || !terminologyProviderLoader) {
      return selectedProvider?.id || null;
    }

    if (!formData.codingSystem) {
      return null;
    }

    const newProvider = await terminologyProviderLoader.ensureProvider(formData.codingSystem);
    return newProvider.id;
  }

  async function runSearch(term, providerId) {
    const normalizedTerm = term.trim();
    const requestId = ++searchRequestSequence.current;

    setSearchError('');
    setSearchResults([]);
    setActiveSearchResultIndex(-1);

    if (!normalizedTerm) {
      setSearchBusy(false);
      return;
    }

    if (!terminologyRegistry) {
      setSearchBusy(false);
      setSearchError('Keine Terminologie-Registry konfiguriert (Demo ohne Live-Provider).');
      return;
    }

    if (!providerId) {
      setSearchBusy(false);
      setSearchError('Bitte zuerst eine Terminologie auswählen.');
      return;
    }

    setSearchBusy(true);

    try {
      const resolvedProviderId = await resolveProviderId(providerId);

      if (requestId !== searchRequestSequence.current) {
        return;
      }

      if (!resolvedProviderId) {
        setSearchError('System unbekannt und kein dynamischer Terminologie-Loader konfiguriert.');
        return;
      }

      const result = await terminologyRegistry.search(normalizedTerm, resolvedProviderId, { limit: 15, offset: 0 });

      if (requestId !== searchRequestSequence.current) {
        return;
      }

      const concepts = normalizeConcepts(result);
      setSearchResults(concepts);
      setActiveSearchResultIndex(concepts.length > 0 ? 0 : -1);
    } catch (e) {
      if (requestId !== searchRequestSequence.current) {
        return;
      }

      console.error('Fehler bei der Terminologiesuche:', e);
      setSearchError('Suche fehlgeschlagen. Bitte Terminologiesystem oder Suchbegriff prüfen.');
    } finally {
      if (requestId === searchRequestSequence.current) {
        setSearchBusy(false);
      }
    }
  }

  function applySearchResult(c) {
    const nextSystem = c.system || formData.codingSystem;

    searchRequestSequence.current += 1;
    setFormData(current => ({
      ...current,
      codingSystem: nextSystem,
      codingCode: c.code || '',
      codingDisplay: c.display || ''
    }));
    setSearchTerm(getConceptLabel(c));
    setSearchResults([]);
    setActiveSearchResultIndex(-1);
    setSearchError('');
    setSearchBusy(false);
  }

  function handleAdd() {
    const codings = [];
    if (formData.codingSystem && formData.codingCode) {
      codings.push({
        system: formData.codingSystem,
        code: formData.codingCode,
        display: formData.codingDisplay || undefined
      });
    }

    let target = null;
    if (formData.mode === 'prescriptive' && formData.targetTransform && formData.targetElement) {
      target = {
        element: formData.targetElement,
        transform: formData.targetTransform,
        value: formData.targetValue || undefined
      };
    }

    addAnnotation(bo, moddle, {
      aspect: formData.aspect,
      mode: formData.mode,
      text: formData.text || undefined,
      codings,
      target
    });

    // Force re-render and mark model as changed
    modeling.updateModdleProperties(element, bo, {});
    setFormData(createEmptyForm());
    setSearchTerm('');
    setSearchResults([]);
    setActiveSearchResultIndex(-1);
    setSearchError('');
    setSearchBusy(false);
    searchRequestSequence.current += 1;
    setSelectedProviderId('');
    setShowForm(false);
    setRefresh(n => n + 1);
  }

  function handleRemove(index) {
    removeAnnotation(bo, index);
    modeling.updateModdleProperties(element, bo, {});
    setRefresh(n => n + 1);
  }

  function handlePreset(e) {
    const providerId = e.target.value;
    searchRequestSequence.current += 1;
    setSelectedProviderId(providerId);
    setFormData(current => ({
      ...current,
      codingSystem: '',
      codingCode: '',
      codingDisplay: ''
    }));
    setSearchTerm('');
    setSearchResults([]);
    setActiveSearchResultIndex(-1);
    setSearchError('');
    setSearchBusy(false);
  }

  function handleSearchInput(e) {
    const value = e.target.value;

    setSearchTerm(value);
    setFormData(current => ({
      ...current,
      codingCode: '',
      codingDisplay: ''
    }));
    void runSearch(value, selectedProviderId);
  }

  function handleSearchKeyDown(e) {
    if (!searchResults.length) {
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSearchResultIndex(current => Math.min(current + 1, searchResults.length - 1));
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSearchResultIndex(current => Math.max(current - 1, 0));
      return;
    }

    if (e.key === 'Enter' || e.key === 'Tab') {
      const selectedIndex = activeSearchResultIndex >= 0 ? activeSearchResultIndex : 0;
      const selectedResult = searchResults[selectedIndex];

      if (selectedResult) {
        e.preventDefault();
        applySearchResult(selectedResult);
      }
    }
  }

  function updateField(field, value) {
    setFormData(current => ({ ...current, [field]: value }));
  }

  return html`
    <div class="clinical-annotations">

      <!-- Existing annotations list -->
      ${annotations.length > 0 && html`
        <div class="annotation-list">
          ${annotations.map((ann, i) => html`
            <div class="annotation-item annotation-item--saved annotation-item--${ann.mode || 'descriptive'}">
              <div class="annotation-item__header">
                <span class="annotation-item__aspect">${getAspectLabel(ann.aspect)}</span>
                <span class="annotation-item__mode badge badge--${ann.mode || 'descriptive'}">
                  ${ann.mode === 'prescriptive' ? '⬤ präskriptiv' : '○ deskriptiv'}
                </span>
                <button
                  class="annotation-item__remove"
                  title="Entfernen"
                  onClick=${() => handleRemove(i)}
                >×</button>
              </div>
              ${ann.text && html`
                <div class="annotation-item__text">${ann.text}</div>
              `}
              ${(ann.codings || []).map(c => html`
                <div class="annotation-item__coding">
                  <span class="coding-system">${getSystemShortName(c.system, terminologyRegistry)}</span>
                  <code class="coding-code">${c.code}</code>
                  ${c.display && html`<span class="coding-display">${c.display}</span>`}
                </div>
              `)}
              ${ann.target && html`
                <div class="annotation-item__target">
                  → <code>${ann.target.element}</code>
                  <span class="target-transform">[${ann.target.transform}]</span>
                  ${ann.target.value && html`<span> = ${ann.target.value}</span>`}
                </div>
              `}
            </div>
          `)}
        </div>
      `}

      ${annotations.length === 0 && !showForm && html`
        <div class="annotation-empty">Keine Annotationen vorhanden.</div>
      `}

      <!-- Add button -->
      ${!showForm && html`
        <button class="annotation-add-btn" onClick=${() => setShowForm(true)}>
          + Annotation hinzufügen
        </button>
      `}

      <!-- Add form -->
      ${showForm && html`
        <div class="annotation-form">
          <div class="form-row">
            <label>Aspekt</label>
            <select
              value=${formData.aspect}
              onChange=${(e) => updateField('aspect', e.target.value)}
            >
              ${ASPECTS.map(a => html`<option value=${a.value}>${a.label}</option>`)}
            </select>
          </div>

          <div class="form-row">
            <label>Modus</label>
            <select
              value=${formData.mode}
              onChange=${(e) => updateField('mode', e.target.value)}
            >
              ${MODES.map(m => html`<option value=${m.value}>${m.label}</option>`)}
            </select>
          </div>

          <div class="form-row">
            <label>Freitext</label>
            <textarea
              rows="2"
              placeholder="Beschreibung in natürlicher Sprache..."
              value=${formData.text}
              onInput=${(e) => updateField('text', e.target.value)}
            />
          </div>

          <fieldset class="form-fieldset">
            <legend>Coding (optional)</legend>
              <div class="form-row">
                <label>Terminologie</label>
                <select
                  value=${selectedProviderId}
                  onChange=${handlePreset}
                >
                  <option value="">– auswählen –</option>
                  ${getRegisteredProviders().map(p =>
                    html`<option value=${p.id}>${p.displayName}</option>`
                  )}
                </select>
              </div>
            ${selectedProviderId && html`
               <div class="form-row">
                 <label>System-URI</label>
                 <input
                   type="text"
                   value=${formData.codingSystem || getSelectedProvider()?.systemUri || ''}
                   readOnly
                 />
               </div>
              <div class="form-row">
                <label>Suche ${searchBusy ? '(suche …)' : ''}</label>
                <input
                  type="text"
                  placeholder="Begriff eingeben"
                  value=${searchTerm}
                  onInput=${handleSearchInput}
                  onKeyDown=${handleSearchKeyDown}
                />
              </div>
              ${searchError && html`<div class="annotation-empty annotation-empty--error">${searchError}</div>`}
              ${searchResults.length > 0 && html`
                <div class="annotation-list annotation-list--search-results">
                  ${searchResults.map((c, index) => html`
                    <div
                      class="annotation-item annotation-item--search-result ${index === activeSearchResultIndex ? 'annotation-item--active' : ''}"
                      onMouseDown=${(event) => {
                       event.preventDefault();
                        applySearchResult(c);
                      }}
                    >
                      <div class="annotation-item__header">
                        <span class="annotation-item__aspect">${getSystemShortName(c.system || getSelectedProvider()?.systemUri, terminologyRegistry)}</span>
                        <span class="annotation-item__mode badge badge--descriptive">Treffer</span>
                      </div>
                      <div class="annotation-item__coding">
                        <code class="coding-code">${c.code}</code>
                        ${c.display && html`<span class="coding-display">${c.display}</span>`}
                      </div>
                    </div>
                  `)}
                </div>
              `}
              <div class="form-row">
                <label>Code</label>
                <input
                  type="text"
                  value=${formData.codingCode}
                  readOnly
                />
              </div>
              <div class="form-row">
                <label>Display</label>
                <input
                  type="text"
                  value=${formData.codingDisplay}
                  readOnly
                />
              </div>
            `}
          </fieldset>

          ${formData.mode === 'prescriptive' && html`
            <fieldset class="form-fieldset form-fieldset--prescriptive">
              <legend>Mapping-Target</legend>
              <div class="form-row">
                <label>FHIRPath (Ziel-Element)</label>
                <input
                  type="text"
                  placeholder="z.B. DocumentReference.type"
                  value=${formData.targetElement}
                  onInput=${(e) => updateField('targetElement', e.target.value)}
                />
              </div>
              <div class="form-row">
                <label>Transform</label>
                <select
                  value=${formData.targetTransform}
                  onChange=${(e) => updateField('targetTransform', e.target.value)}
                >
                  ${TRANSFORMS.map(t =>
                    html`<option value=${t.value}>${t.label}</option>`
                  )}
                </select>
              </div>
              ${(formData.targetTransform === 'fixed' || formData.targetTransform === 'translate') && html`
                <div class="form-row">
                  <label>${formData.targetTransform === 'fixed' ? 'Fester Wert' : 'ConceptMap-URL'}</label>
                  <input
                    type="text"
                    placeholder=${formData.targetTransform === 'fixed' ? 'z.B. final' : 'https://...'}
                    value=${formData.targetValue}
                    onInput=${(e) => updateField('targetValue', e.target.value)}
                  />
                </div>
              `}
            </fieldset>
          `}

          <div class="form-actions">
            <button class="btn btn--primary" onClick=${handleAdd}>
              Hinzufügen
            </button>
            <button class="btn btn--secondary" onClick=${() => { setShowForm(false); setFormData(createEmptyForm()); }}>
              Abbrechen
            </button>
          </div>
        </div>
      `}
    </div>
  `;
}

function getConceptLabel(concept) {
  return concept.display || concept.code || '';
}

function getAspectLabel(aspect) {
  const map = {
    clinicalContent: 'Klinischer Inhalt',
    documentClass: 'Dokumentklasse',
    documentType: 'Dokumenttyp',
    note: 'Notiz',
    confidentiality: 'Vertraulichkeit',
    status: 'Status',
    format: 'Format',
    participant: 'Teilnehmer'
  };
  return map[aspect] || aspect;
}

function getSystemShortName(uri, registry) {
  if (!uri) return '';
  if (registry) {
    // Sucht den registrierten Namen dynamisch heraus
    const provider = registry.listProviders().find(p => p.systemUri === uri);
    if (provider && provider.displayName) return provider.displayName;
  }
  // Fallback: Zeigt einfach den letzten Teil der URL, wenn der Provider nicht registriert ist
  return uri.split('/').pop();
}
