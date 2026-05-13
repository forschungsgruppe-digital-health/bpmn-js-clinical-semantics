import { html } from 'htm/preact';
import { useEffect, useRef, useState } from '@bpmn-io/properties-panel/preact/hooks';
import { useService } from 'bpmn-js-properties-panel';
import {
  getAnnotations,
  addAnnotation,
  removeAnnotation
} from '../../services/AnnotationHelper.js';
import {
  normalizeConcepts,
  getConceptLabel,
  getAutocompleteSuffix
} from './search-utils.js';

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
  const searchBlurTimeout = useRef(null);
  const searchSuggestionItemRefs = useRef([]);

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

  function resetSearchState() {
    if (searchBlurTimeout.current) {
      clearTimeout(searchBlurTimeout.current);
      searchBlurTimeout.current = null;
    }

    setSearchTerm('');
    setSearchResults([]);
    setActiveSearchResultIndex(-1);
    setSearchError('');
    setSearchBusy(false);
    setSearchFocused(false);
  }

  function resetFormState() {
    searchRequestSequence.current += 1;
    setFormData(createEmptyForm());
    setSelectedProviderId('');
    resetSearchState();
  }

  function closeForm() {
    resetFormState();
    setShowForm(false);
  }

  function applySearchResult(c, options = {}) {
    const { submit = false } = options;
    const nextSystem = c.system || formData.codingSystem;
    const nextFormData = {
      ...formData,
      codingSystem: nextSystem,
      codingCode: c.code || '',
      codingDisplay: c.display || ''
    };

    if (submit) {
      handleAdd(nextFormData);
      return;
    }

    searchRequestSequence.current += 1;
    setFormData(nextFormData);
    setSearchTerm(getConceptLabel(c));
    setSearchResults([]);
    setActiveSearchResultIndex(-1);
    setSearchError('');
    setSearchBusy(false);
    setSearchFocused(false);
  }

  function handleAdd(nextFormData = formData) {
    const codings = [];
    if (nextFormData.codingSystem && nextFormData.codingCode) {
      codings.push({
        system: nextFormData.codingSystem,
        code: nextFormData.codingCode,
        display: nextFormData.codingDisplay || undefined
      });
    }

    let target = null;
    if (nextFormData.mode === 'prescriptive' && nextFormData.targetTransform && nextFormData.targetElement) {
      target = {
        element: nextFormData.targetElement,
        transform: nextFormData.targetTransform,
        value: nextFormData.targetValue || undefined
      };
    }

    addAnnotation(bo, moddle, {
      aspect: nextFormData.aspect,
      mode: nextFormData.mode,
      text: nextFormData.text || undefined,
      codings,
      target
    });

    // Force re-render and mark model as changed
    modeling.updateModdleProperties(element, bo, {});
    closeForm();
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
    resetSearchState();
  }

  function handleSearchInput(e) {
    const value = e.target.value;

    if (searchBlurTimeout.current) {
      clearTimeout(searchBlurTimeout.current);
      searchBlurTimeout.current = null;
    }

    setSearchFocused(true);
    setSearchTerm(value);
    setFormData(current => ({
      ...current,
      codingCode: '',
      codingDisplay: ''
    }));
    void runSearch(value, selectedProviderId);
  }

  function handleSearchFocus() {
    if (searchBlurTimeout.current) {
      clearTimeout(searchBlurTimeout.current);
      searchBlurTimeout.current = null;
    }

    setSearchFocused(true);
  }

  function handleSearchBlur() {
    if (searchBlurTimeout.current) {
      clearTimeout(searchBlurTimeout.current);
    }

    searchBlurTimeout.current = setTimeout(() => {
      setSearchFocused(false);
      searchBlurTimeout.current = null;
    }, 120);
  }

  function handleSearchKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setSearchFocused(false);
      return;
    }

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
        applySearchResult(selectedResult, {
          submit: e.key === 'Tab' && !e.shiftKey && formData.mode !== 'prescriptive'
        });
      }
    }
  }

  function handleFormKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeForm();
    }
  }

  function handleSubmitOnTab(e) {
    if (e.key !== 'Tab' || e.shiftKey) {
      return;
    }

    e.preventDefault();
    handleAdd();
  }

  function updateField(field, value) {
    setFormData(current => ({ ...current, [field]: value }));
  }

  const [searchFocused, setSearchFocused] = useState(false);
  const activeSearchResult = searchResults[activeSearchResultIndex >= 0 ? activeSearchResultIndex : 0] || null;
  const searchCompletion = getAutocompleteSuffix(searchTerm, activeSearchResult);
  const showSearchSuggestions = searchFocused && searchResults.length > 0;

  useEffect(() => {
    if (!showSearchSuggestions || activeSearchResultIndex < 0) {
      return;
    }

    const activeItem = searchSuggestionItemRefs.current[activeSearchResultIndex];

    if (activeItem) {
      activeItem.scrollIntoView({
        block: 'nearest'
      });
    }
  }, [activeSearchResultIndex, showSearchSuggestions]);

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
        <div class="annotation-form" onKeyDown=${handleFormKeyDown}>
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
                 onKeyDown=${!selectedProviderId && formData.mode === 'descriptive' ? handleSubmitOnTab : undefined}
               >
                 <option value="">– auswählen –</option>
                 ${getRegisteredProviders().map(p =>
                   html`<option value=${p.id}>${p.displayName}</option>`
                 )}
               </select>
             </div>
            ${selectedProviderId && html`
              <div class="form-row">
                <label>Suche ${searchBusy ? '(suche …)' : ''}</label>
                <div class="search-field">
                  <div class="search-input-shell ${searchFocused ? 'search-input-shell--focused' : ''}">
                    <div class="search-input-ghost" aria-hidden="true">
                      <span class="search-input-ghost__typed">${searchTerm}</span><span class="search-input-ghost__completion">${searchCompletion}</span>
                    </div>
                    <input
                      class="search-input-field"
                      type="text"
                      placeholder="Begriff eingeben"
                      value=${searchTerm}
                      onInput=${handleSearchInput}
                      onKeyDown=${handleSearchKeyDown}
                      onFocus=${handleSearchFocus}
                      onBlur=${handleSearchBlur}
                      autocomplete="off"
                    />
                  </div>
                  ${showSearchSuggestions && html`
                    <div class="search-suggestions" role="listbox">
                      ${searchResults.map((c, index) => html`
                        <div
                          class="search-suggestion ${index === activeSearchResultIndex ? 'search-suggestion--active' : ''}"
                          ref=${(node) => {
                            searchSuggestionItemRefs.current[index] = node;
                          }}
                          onMouseMove=${() => setActiveSearchResultIndex(index)}
                          onMouseDown=${(event) => {
                            event.preventDefault();
                            if (searchBlurTimeout.current) {
                              clearTimeout(searchBlurTimeout.current);
                              searchBlurTimeout.current = null;
                            }
                            applySearchResult(c);
                          }}
                        >
                          <div class="search-suggestion__label">${getConceptLabel(c)}</div>
                          <div class="search-suggestion__meta">
                            <span class="coding-system">${getSystemShortName(c.system || getSelectedProvider()?.systemUri, terminologyRegistry)}</span>
                            <code class="coding-code">${c.code}</code>
                          </div>
                        </div>
                      `)}
                    </div>
                  `}
                </div>
              </div>
              <div class="form-row">
                <label>System-URI</label>
                <input
                  type="text"
                  value=${formData.codingSystem || getSelectedProvider()?.systemUri || ''}
                  readOnly
                />
              </div>
              ${searchError && html`<div class="annotation-empty annotation-empty--error">${searchError}</div>`}
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
                  onKeyDown=${formData.mode === 'descriptive' ? handleSubmitOnTab : undefined}
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
                  onKeyDown=${(formData.targetTransform !== 'fixed' && formData.targetTransform !== 'translate') ? handleSubmitOnTab : undefined}
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
                    onKeyDown=${handleSubmitOnTab}
                  />
                </div>
              `}
            </fieldset>
          `}
        </div>
      `}
    </div>
  `;
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
