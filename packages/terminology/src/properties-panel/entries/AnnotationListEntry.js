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

const TERMINOLOGY_PRESETS = [
  { label: '– Manuell eingeben –', system: '', code: '', display: '' },
  { label: 'SNOMED CT', system: 'http://snomed.info/sct', code: '', display: '' },
  { label: 'LOINC', system: 'http://loinc.org', code: '', display: '' },
  { label: 'ICD-10-GM', system: 'http://fhir.de/CodeSystem/bfarm/icd-10-gm', code: '', display: '' },
  { label: 'OPS', system: 'http://fhir.de/CodeSystem/bfarm/ops', code: '', display: '' },
  { label: 'IHE XDS classCode', system: 'http://ihe-d.de/CodeSystems/IHEXDSclassCode', code: '', display: '' },
  { label: 'IHE XDS typeCode', system: 'http://ihe-d.de/CodeSystems/IHEXDStypeCode', code: '', display: '' },
  { label: 'KDL (DVMD)', system: 'http://dvmd.de/fhir/CodeSystem/kdl', code: '', display: '' }
];

export function AnnotationListEntry(props) {
  const { element } = props;
  const moddle = useService('moddle');
  const modeling = useService('modeling');
  const translate = useService('translate');

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(createEmptyForm());
  const [, setRefresh] = useState(0);

  const bo = element.businessObject;
  const annotations = getAnnotations(bo);

  function createEmptyForm() {
    return {
      aspect: 'clinicalContent',
      mode: 'descriptive',
      text: '',
      codingSystem: '',
      codingCode: '',
      codingDisplay: ''
    };
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

    addAnnotation(bo, moddle, {
      aspect: formData.aspect,
      mode: formData.mode,
      text: formData.text || undefined,
      codings
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
    const preset = TERMINOLOGY_PRESETS.find(p => p.system === e.target.value);
    if (preset) {
      setFormData({ ...formData, codingSystem: preset.system });
    }
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
                  <span class="coding-system">${getSystemShortName(c.system)}</span>
                  <code class="coding-code">${c.code}</code>
                  ${c.display && html`<span class="coding-display">${c.display}</span>`}
                </div>
              `)}
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
                ${TERMINOLOGY_PRESETS.map(p =>
                  html`<option value=${p.system}>${p.label}</option>`
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

function getSystemShortName(uri) {
  const map = {
    'http://snomed.info/sct': 'SNOMED CT',
    'http://loinc.org': 'LOINC',
    'http://fhir.de/CodeSystem/bfarm/icd-10-gm': 'ICD-10-GM',
    'http://fhir.de/CodeSystem/bfarm/ops': 'OPS',
    'http://ihe-d.de/CodeSystems/IHEXDSclassCode': 'IHE classCode',
    'http://ihe-d.de/CodeSystems/IHEXDStypeCode': 'IHE typeCode',
    'http://dvmd.de/fhir/CodeSystem/kdl': 'KDL',
    'http://terminology.hl7.org/CodeSystem/icd-o-3': 'ICD-O-3'
  };
  return map[uri] || uri.split('/').pop();
}
