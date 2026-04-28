import { html } from 'htm/preact';
import { useState } from '@bpmn-io/properties-panel/preact/hooks';
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

  function findProviderIdForSystem(systemUri) {
    if (!terminologyRegistry || !systemUri) return null;
    try {
      const match = terminologyRegistry.findProviderBySystem(systemUri);
      return match?.id || null;
    } catch {
      return null;
    }
  }

  async function runSearch() {
    setSearchError('');
    setSearchResults([]);

    if (!terminologyRegistry) {
      setSearchError('Keine Terminologie-Registry konfiguriert (Demo ohne Live-Provider).');
      return;
    }
    if (!formData.codingSystem) {
      setSearchError('Bitte zuerst eine Terminologie auswählen (System-URI).');
      return;
    }
    // Leere Suche ab sofort erlauben, um die ersten 15 Ergebnisse zum "Stöbern" zu laden!

    let providerId = findProviderIdForSystem(formData.codingSystem);

    if (!providerId) {
      if (!terminologyProviderLoader) {
        setSearchError('System unbekannt und kein dynamischer Terminologie-Loader konfiguriert.');
        return;
      }

      setSearchBusy(true);
      try {
        const newProvider = await terminologyProviderLoader.ensureProvider(formData.codingSystem);
        providerId = newProvider.id;
      } catch (e) {
        setSearchBusy(false);
        setSearchError('System unbekannt und dynamisches Nachladen via FHIR fehlgeschlagen.');
        return;
      }
    }

    setSearchBusy(true);
    try {
      const result = await terminologyRegistry.search(searchTerm.trim(), providerId, { limit: 15, offset: 0 });
      setSearchResults(normalizeConcepts(result));
    } catch (e) {
      console.error("Fehler bei der Terminologiesuche:", e);
      if (!searchTerm.trim()) {
        setSearchError('Leere Suche abgelehnt: Bitte Suchbegriff eingeben (Schutz vor Server-Überlastung oder System fehlt).');
      } else {
        setSearchError('Fehler 404: Dieses CodeSystem ist auf dem Server nicht installiert oder erreichbar.');
      }
    } finally {
      setSearchBusy(false);
    }
  }

  function applySearchResult(c) {
    updateField('codingSystem', c.system || formData.codingSystem);
    updateField('codingCode', c.code || '');
    updateField('codingDisplay', c.display || '');
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
    setShowForm(false);
    setRefresh(n => n + 1);
  }

  function handleRemove(index) {
    removeAnnotation(bo, index);
    modeling.updateModdleProperties(element, bo, {});
    setRefresh(n => n + 1);
  }

  function handlePreset(e) {
    const system = e.target.value;
    setFormData({ ...formData, codingSystem: system });
    setSearchTerm('');
    setSearchResults([]);
    setSearchError('');
  }

  function updateField(field, value) {
    setFormData({ ...formData, [field]: value });
  }

  return html`
    <div class="clinical-annotations">

      <!-- Existing annotations list -->
      ${annotations.length > 0 && html`
        <div class="annotation-list">
          ${annotations.map((ann, i) => html`
            <div class="annotation-item annotation-item--${ann.mode || 'descriptive'}">
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
                value=${formData.codingSystem}
                onChange=${handlePreset}
              >
                <option value="">– Manuell eingeben –</option>
                ${(terminologyRegistry ? terminologyRegistry.listProviders() : []).map(p =>
                  html`<option value=${p.systemUri}>${p.displayName}</option>`
                )}
              </select>
            </div>
            ${formData.codingSystem && html`
              <div class="form-row">
                <label>System-URI</label>
                <input
                  type="text"
                  value=${formData.codingSystem}
                  onInput=${(e) => updateField('codingSystem', e.target.value)}
                />
              </div>
              <div class="form-row">
                <label>Suche</label>
                <div style="display:flex; gap:8px; align-items:center; width:100%;">
                  <input
                    type="text"
                    placeholder="Begriff eingeben (live, falls Provider konfiguriert)…"
                    value=${searchTerm}
                    onInput=${(e) => { setSearchTerm(e.target.value); setSearchError(''); }}
                    onKeyDown=${(e) => { if (e.key === 'Enter') runSearch(); }}
                    style="flex:1;"
                  />
                  <button class="btn btn--secondary" disabled=${searchBusy} onClick=${runSearch}>
                    ${searchBusy ? '…' : 'Suchen'}
                  </button>
                </div>
              </div>
              ${searchError && html`<div class="annotation-empty" style="color:#b42318;">${searchError}</div>`}
              ${searchResults.length > 0 && html`
                <div class="annotation-list" style="margin-top:8px;">
                  ${searchResults.map(c => html`
                    <div class="annotation-item" style="cursor:pointer;" onClick=${() => applySearchResult(c)}>
                      <div class="annotation-item__header">
                        <span class="annotation-item__aspect">${getSystemShortName(c.system || formData.codingSystem, terminologyRegistry)}</span>
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
                  placeholder="z.B. 169069000"
                  value=${formData.codingCode}
                  onInput=${(e) => updateField('codingCode', e.target.value)}
                />
              </div>
              <div class="form-row">
                <label>Display</label>
                <input
                  type="text"
                  placeholder="z.B. CT of chest (procedure)"
                  value=${formData.codingDisplay}
                  onInput=${(e) => updateField('codingDisplay', e.target.value)}
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
