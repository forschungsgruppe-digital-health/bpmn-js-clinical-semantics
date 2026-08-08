import { html } from 'htm/preact';
import { useState } from '@bpmn-io/properties-panel/preact/hooks';
import { useService } from 'bpmn-js-properties-panel';
import {
  getResourceMappings,
  getBindableTerminologyAnnotations,
  addResourceMapping,
  removeResourceMapping
} from '../../services/MappingHelper.js';
import {
  FHIR_RESOURCE_TYPES,
  INTERACTIONS,
  DIRECTIONS,
  SEMANTIC_ROLES
} from '../../core/types.js';

export function FhirMappingListEntry(props) {
  const { element } = props;
  const moddle = useService('moddle');
  const modeling = useService('modeling');
  const translate = useService('translate');

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [, setRefresh] = useState(0);

  const bo = element.businessObject;
  const mappings = getResourceMappings(bo);
  const terminologyAnnotations = getBindableTerminologyAnnotations(bo);

  function emptyForm() {
    return {
      resourceType: '', profile: '', interaction: 'create', direction: 'output',
      kePath: '', keRole: '', keBinding: '', keFixed: ''
    };
  }

  function handleAdd() {
    const keyElements = [];
    if (form.kePath) {
      keyElements.push({
        path: form.kePath,
        semanticRole: form.keRole || undefined,
        terminologyBinding: form.keBinding || undefined,
        fixedValue: form.keFixed || undefined
      });
    }
    addResourceMapping(bo, moddle, {
      resourceType: form.resourceType,
      profile: form.profile || undefined,
      interaction: form.interaction,
      direction: form.direction,
      keyElements
    });
    modeling.updateModdleProperties(element, bo, {});
    setForm(emptyForm());
    setShowForm(false);
    setRefresh(n => n + 1);
  }

  function handleRemove(i) {
    removeResourceMapping(bo, i);
    modeling.updateModdleProperties(element, bo, {});
    setRefresh(n => n + 1);
  }

  function u(field, value) { setForm({ ...form, [field]: value }); }

  return html`
    <div class="fhir-mappings">

      ${mappings.length > 0 && html`
        <div class="fhir-mapping-list">
          ${mappings.map((m, i) => html`
            <div class="fhir-mapping-item">
              <div class="fhir-mapping-item__header">
                <span class="fhir-resource-badge">${m.resourceType}</span>
                <span class="fhir-direction">${m.direction || ''}</span>
                <span class="fhir-interaction">[${m.interaction || ''}]</span>
                <button class="annotation-item__remove" onClick=${() => handleRemove(i)}>×</button>
              </div>
              ${m.profile && html`
                <div class="fhir-mapping-item__profile">Profil: <code>${shortenUrl(m.profile)}</code></div>
              `}
              ${(m.keyElements || []).map(ke => html`
                <div class="fhir-mapping-item__key-element">
                  <code>${ke.path}</code>
                  ${ke.semanticRole && html`<span class="badge badge--annotation">${ke.semanticRole}</span>`}
                  ${ke.terminologyBinding && html`
                    <span class="badge badge--annotation">
                      ${getTerminologyBindingLabel(ke.terminologyBinding, terminologyAnnotations)}
                    </span>
                  `}
                  ${ke.fixedValue && html`<span> = ${ke.fixedValue}</span>`}
                </div>
              `)}
            </div>
          `)}
        </div>
      `}

      ${mappings.length === 0 && !showForm && html`
        <div class="annotation-empty">Keine FHIR-Mappings vorhanden.</div>
      `}

      ${!showForm && html`
        <button class="annotation-add-btn" onClick=${() => setShowForm(true)}>
          + FHIR-Mapping hinzufügen
        </button>
      `}

      ${showForm && html`
        <div class="annotation-form">
          <div class="form-row">
            <label class="bio-properties-panel-label">FHIR Ressourcentyp</label>
            <select class="bio-properties-panel-input" value=${form.resourceType} onChange=${e => u('resourceType', e.target.value)}>
              <option value="">– auswählen –</option>
              ${FHIR_RESOURCE_TYPES.map(r =>
                html`<option value=${r.type}>${r.label}</option>`
              )}
            </select>
          </div>

          <div class="form-row">
            <label class="bio-properties-panel-label">Profil-URL (optional)</label>
            <input class="bio-properties-panel-input" type="text" placeholder="https://mii.de/fhir/..." value=${form.profile}
                   onInput=${e => u('profile', e.target.value)} />
          </div>

          <div class="form-row">
            <label class="bio-properties-panel-label">Interaktion</label>
            <select class="bio-properties-panel-input" value=${form.interaction} onChange=${e => u('interaction', e.target.value)}>
              ${INTERACTIONS.map(i => html`<option value=${i.value}>${i.label}</option>`)}
            </select>
          </div>

          <div class="form-row">
            <label class="bio-properties-panel-label">Richtung</label>
            <select class="bio-properties-panel-input" value=${form.direction} onChange=${e => u('direction', e.target.value)}>
              ${DIRECTIONS.map(d => html`<option value=${d.value}>${d.label}</option>`)}
            </select>
          </div>

          <fieldset class="form-fieldset">
            <legend>Key Element (optional)</legend>
            <div class="form-row">
              <label class="bio-properties-panel-label">FHIRPath</label>
              <input class="bio-properties-panel-input" type="text" placeholder="z.B. DiagnosticReport.status" value=${form.kePath}
                     onInput=${e => u('kePath', e.target.value)} />
            </div>
            <div class="form-row">
              <label class="bio-properties-panel-label">Semantische Rolle</label>
              <select class="bio-properties-panel-input" value=${form.keRole} onChange=${e => u('keRole', e.target.value)}>
                <option value="">– keine –</option>
                ${SEMANTIC_ROLES.map(r => html`<option value=${r.value}>${r.label}</option>`)}
              </select>
            </div>
            <div class="form-row">
              <label class="bio-properties-panel-label">Terminology binding</label>
              <select class="bio-properties-panel-input" value=${form.keBinding} onChange=${e => u('keBinding', e.target.value)}>
                <option value="">– none –</option>
                ${terminologyAnnotations.map((annotation) => html`
                  <option value=${annotation.id}>${getTerminologyBindingLabel(annotation.id, terminologyAnnotations)}</option>
                `)}
              </select>
            </div>
            <div class="form-row">
              <label class="bio-properties-panel-label">Fester Wert (optional)</label>
              <input class="bio-properties-panel-input" type="text" placeholder="z.B. final" value=${form.keFixed}
                     onInput=${e => u('keFixed', e.target.value)} />
            </div>
          </fieldset>

          <div class="form-actions">
            <button class="btn btn--primary" onClick=${handleAdd} disabled=${!form.resourceType}>Hinzufügen</button>
            <button class="btn btn--secondary" onClick=${() => { setShowForm(false); setForm(emptyForm()); }}>Abbrechen</button>
          </div>
        </div>
      `}
    </div>
  `;
}

function shortenUrl(url) {
  if (!url) return '';
  const parts = url.split('/');
  return parts.length > 3 ? '…/' + parts.slice(-2).join('/') : url;
}

function getTerminologyBindingLabel(id, annotations) {
  const annotation = annotations.find((entry) => entry.id === id);

  if (!annotation) {
    return id;
  }

  const text = annotation.text ? ` - ${annotation.text}` : '';

  return `${annotation.id}${text}`;
}
