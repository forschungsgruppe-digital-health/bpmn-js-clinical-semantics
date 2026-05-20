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
  { value: 'clinicalContent', label: 'Clinical content' },
  { value: 'documentClass', label: 'Document class (IHE XDS classCode)' },
  { value: 'documentType', label: 'Document type (IHE XDS typeCode / KDL)' },
  { value: 'note', label: 'Free-text note' }
];

const MODES = [
  { value: 'descriptive', label: 'Descriptive' },
  { value: 'prescriptive', label: 'Prescriptive' }
];

const TRANSFORMS = [
  { value: '', label: '– no target –' },
  { value: 'copy', label: 'copy (Code → target)' },
  { value: 'fixed', label: 'fixed (fixed value)' },
  { value: 'translate', label: 'translate (ConceptMap)' }
];

export function AnnotationListEntry(props) {
  const { element } = props;
  const moddle = useService('moddle');
  const modeling = useService('modeling');
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
  const searchInputRef = useRef(null);

  const bo = element.businessObject;
  const annotations = getAnnotations(bo);

  function createEmptyForm() {
    return {
      aspect: 'clinicalContent',
      mode: 'descriptive',
      text: '',
      codings: [],
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

    return null;
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
      setSearchError('No terminology registry configured (demo without live provider).');
      return;
    }

    if (!providerId) {
      setSearchBusy(false);
      setSearchError('Please select a terminology first.');
      return;
    }

    setSearchBusy(true);

    try {
      const resolvedProviderId = await resolveProviderId(providerId);

      if (requestId !== searchRequestSequence.current) {
        return;
      }

      if (!resolvedProviderId) {
        setSearchError('Unknown system and no dynamic terminology loader configured.');
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

      console.error('Terminology search failed:', e);
      setSearchError('Search failed. Please check the terminology system or search term.');
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

  function createCodingFromConcept(c) {
    return {
      system: c.system || getSelectedProvider()?.systemUri || '',
      code: c.code || '',
      display: c.display || ''
    };
  }

  function addCodingToForm(coding, options = {}) {
    const { submit = false, refocus = false } = options;

    if (!coding.system || !coding.code) {
      return;
    }

    const alreadyExists = formData.codings.some(existing =>
      existing.system === coding.system &&
      existing.code === coding.code &&
      (existing.display || '') === (coding.display || '')
    );

    const nextCodings = alreadyExists ? formData.codings : [ ...formData.codings, coding ];
    const nextFormData = {
      ...formData,
      codings: nextCodings
    };

    searchRequestSequence.current += 1;
    setFormData(nextFormData);
    resetSearchState();

    if (refocus) {
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
    }

    if (submit) {
      handleAdd(nextFormData);
    }
  }

  function applySearchResult(c, options = {}) {
    addCodingToForm(createCodingFromConcept(c), options);
  }

  function handleAdd(nextFormData = formData) {
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
      codings: nextFormData.codings,
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

  function acceptSearchSuggestion(result) {
    const label = getConceptLabel(result);

    if (!label) {
      return;
    }

    searchRequestSequence.current += 1;
    setSearchTerm(label);
    setSearchFocused(true);
    setActiveSearchResultIndex(-1);

    requestAnimationFrame(() => {
      if (searchInputRef.current) {
        const caretPosition = label.length;
        searchInputRef.current.focus();
        searchInputRef.current.setSelectionRange(caretPosition, caretPosition);
      }
    });

    void runSearch(label, selectedProviderId);
  }

  function handleSearchKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setSearchFocused(false);
      return;
    }

    if (!searchResults.length) {
      if ((e.key === 'Enter' || e.key === 'Tab') && activeSearchResult && searchTerm.trim()) {
        e.preventDefault();
        e.stopPropagation();
        applySearchResult(activeSearchResult, {
          refocus: true
        });
        return;
      }

      if (e.key === 'Tab' && !e.shiftKey && !searchTerm.trim() && canSubmitFromCodingArea(formData)) {
        e.preventDefault();
        e.stopPropagation();
        handleAdd();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      setActiveSearchResultIndex(current => Math.min(current + 1, searchResults.length - 1));
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      setActiveSearchResultIndex(current => Math.max(current - 1, 0));
      return;
    }

    if (e.key === 'ArrowRight') {
      const selectedIndex = activeSearchResultIndex >= 0 ? activeSearchResultIndex : 0;
      const selectedResult = searchResults[selectedIndex] || activeSearchResult;

      if (selectedResult) {
        e.preventDefault();
        e.stopPropagation();
        acceptSearchSuggestion(selectedResult);
      }
      return;
    }

    if (e.key === 'Enter' || e.key === 'Tab') {
      const selectedIndex = activeSearchResultIndex >= 0 ? activeSearchResultIndex : 0;
      const selectedResult = searchResults[selectedIndex] || activeSearchResult;

      if (selectedResult) {
        e.preventDefault();
        e.stopPropagation();
        applySearchResult(selectedResult, {
          refocus: true
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
    e.stopPropagation();
    handleAdd();
  }

  function handleRemoveCoding(index) {
    setFormData(current => ({
      ...current,
      codings: current.codings.filter((_, codingIndex) => codingIndex !== index)
    }));
  }

  function hasTargetData(currentFormData) {
    return Boolean(
      currentFormData.targetElement ||
      currentFormData.targetTransform ||
      currentFormData.targetValue
    );
  }

  function canSubmitFromCodingArea(currentFormData) {
    return currentFormData.mode !== 'prescriptive' || !hasTargetData(currentFormData);
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

  useEffect(() => {
    const searchInput = searchInputRef.current;

    if (!searchInput) {
      return;
    }

    const nativeKeyDownHandler = (event) => {
      handleSearchKeyDown(event);
    };

    searchInput.addEventListener('keydown', nativeKeyDownHandler, true);

    return () => {
      searchInput.removeEventListener('keydown', nativeKeyDownHandler, true);
    };
  }, [
    activeSearchResult,
    activeSearchResultIndex,
    formData,
    searchResults,
    searchTerm
  ]);

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
                  ${ann.mode === 'prescriptive' ? '⬤ prescriptive' : '○ descriptive'}
                </span>
                <button
                  class="annotation-item__remove"
                  title="Remove"
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
        <div class="annotation-empty">No annotations yet.</div>
      `}

      <!-- Add button -->
      ${!showForm && html`
        <button class="annotation-add-btn" onClick=${() => setShowForm(true)}>
          + Add annotation
        </button>
      `}

      <!-- Add form -->
      ${showForm && html`
        <div class="annotation-form" onKeyDown=${handleFormKeyDown}>
          <div class="form-row">
            <label>Aspect</label>
            <select
              value=${formData.aspect}
              onChange=${(e) => updateField('aspect', e.target.value)}
            >
              ${ASPECTS.map(a => html`<option value=${a.value}>${a.label}</option>`)}
            </select>
          </div>

          <div class="form-row">
            <label>Mode</label>
            <select
              value=${formData.mode}
              onChange=${(e) => updateField('mode', e.target.value)}
            >
              ${MODES.map(m => html`<option value=${m.value}>${m.label}</option>`)}
            </select>
          </div>

          <div class="form-row">
            <label>Free text</label>
            <textarea
              rows="2"
              placeholder="Description in natural language..."
              value=${formData.text}
              onInput=${(e) => updateField('text', e.target.value)}
            />
          </div>

          <fieldset class="form-fieldset">
            <legend>Coding (optional)</legend>
              <div class="form-row">
                <label>Terminology</label>
                <select
                  value=${selectedProviderId}
                  onChange=${handlePreset}
                 onKeyDownCapture=${!selectedProviderId && canSubmitFromCodingArea(formData) ? handleSubmitOnTab : undefined}
               >
                 <option value="">– select –</option>
                 ${getRegisteredProviders().map(p =>
                   html`<option value=${p.id}>${p.displayName}</option>`
                 )}
               </select>
             </div>
            ${formData.codings.length > 0 && html`
              <div class="form-row">
                <label>Selected codings</label>
                <div class="selected-codings">
                  ${formData.codings.map((coding, index) => html`
                    <div class="selected-coding">
                      <div class="selected-coding__content">
                        <span class="coding-system">${getSystemShortName(coding.system, terminologyRegistry)}</span>
                        <code class="coding-code">${coding.code}</code>
                        ${coding.display && html`<span class="coding-display">${coding.display}</span>`}
                      </div>
                      <button
                        type="button"
                        class="selected-coding__remove"
                        title="Remove coding"
                        onClick=${() => handleRemoveCoding(index)}
                      >×</button>
                    </div>
                  `)}
                </div>
              </div>
            `}
            ${selectedProviderId && html`
              <div class="form-row">
               <label>Search ${searchBusy ? '(searching...)' : ''}</label>
                <div class="search-field">
                  <div class="search-input-shell ${searchFocused ? 'search-input-shell--focused' : ''}">
                    <div class="search-input-ghost" aria-hidden="true">
                      <span class="search-input-ghost__typed">${searchTerm}</span><span class="search-input-ghost__completion">${searchCompletion}</span>
                    </div>
                    <input
                      ref=${searchInputRef}
                      class="search-input-field"
                      type="text"
                      placeholder="Enter term"
                      value=${searchTerm}
                      onInput=${handleSearchInput}
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
                <div class="form-hint">
                  Press Tab or Enter to add an annotation (multiple entries allowed).
                  To submit, press Tab in the empty search field.
                </div>
              </div>
              ${searchError && html`<div class="annotation-empty annotation-empty--error">${searchError}</div>`}
            `}
          </fieldset>

          ${formData.mode === 'prescriptive' && html`
            <fieldset class="form-fieldset form-fieldset--prescriptive">
              <legend>Mapping target (optional)</legend>
              <div class="form-row">
                <label>FHIRPath (target element)</label>
                <input
                  type="text"
                  placeholder="e.g. DocumentReference.type"
                  value=${formData.targetElement}
                  onInput=${(e) => updateField('targetElement', e.target.value)}
                />
              </div>
              <div class="form-row">
                <label>Transform</label>
                <select
                  value=${formData.targetTransform}
                  onChange=${(e) => updateField('targetTransform', e.target.value)}
                  onKeyDownCapture=${(formData.targetTransform !== 'fixed' && formData.targetTransform !== 'translate') ? handleSubmitOnTab : undefined}
                >
                  ${TRANSFORMS.map(t =>
                    html`<option value=${t.value}>${t.label}</option>`
                  )}
                </select>
              </div>
              ${(formData.targetTransform === 'fixed' || formData.targetTransform === 'translate') && html`
                <div class="form-row">
                  <label>${formData.targetTransform === 'fixed' ? 'Fixed value' : 'ConceptMap URL'}</label>
                  <input
                    type="text"
                    placeholder=${formData.targetTransform === 'fixed' ? 'e.g. final' : 'https://...'}
                    value=${formData.targetValue}
                    onInput=${(e) => updateField('targetValue', e.target.value)}
                    onKeyDownCapture=${handleSubmitOnTab}
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
    clinicalContent: 'Clinical content',
    documentClass: 'Document class',
    documentType: 'Document type',
    note: 'Note',
    confidentiality: 'Confidentiality',
    status: 'Status',
    format: 'Format',
    participant: 'Participant'
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
