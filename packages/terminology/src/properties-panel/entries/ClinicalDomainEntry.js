import { html } from 'htm/preact';
import { useService } from 'bpmn-js-properties-panel';

const CLINICAL_DOMAINS = [
  { value: '', label: '– nicht gesetzt –' },
  { value: 'diagnostics', label: 'Diagnostik' },
  { value: 'staging', label: 'Staging' },
  { value: 'therapy', label: 'Therapie' },
  { value: 'follow-up', label: 'Nachsorge' },
  { value: 'palliation', label: 'Palliativversorgung' },
  { value: 'prevention', label: 'Prävention' },
  { value: 'rehabilitation', label: 'Rehabilitation' }
];

export function ClinicalDomainEntry(props) {
  const { element } = props;
  const modeling = useService('modeling');
  const translate = useService('translate');

  const bo = element.businessObject;
  const value = bo.get('term:clinicalDomain') || '';

  const setValue = (val) => {
    modeling.updateModdleProperties(element, bo, {
      'term:clinicalDomain': val || undefined
    });
  };

  return html`
    <div class="bio-properties-panel-entry">
      <label class="bio-properties-panel-label" for="clinical-domain">
        ${translate('Klinische Domäne')}
      </label>
      <select
        id="clinical-domain"
        class="bio-properties-panel-input"
        value=${value}
        onChange=${(e) => setValue(e.target.value)}
      >
        ${CLINICAL_DOMAINS.map(d =>
          html`<option value=${d.value} selected=${d.value === value}>${d.label}</option>`
        )}
      </select>
    </div>
  `;
}
