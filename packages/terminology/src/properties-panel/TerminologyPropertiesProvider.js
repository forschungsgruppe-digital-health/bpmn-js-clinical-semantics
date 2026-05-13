import { is } from 'bpmn-js/lib/util/ModelUtil';
import { ClinicalDomainEntry } from './entries/ClinicalDomainEntry.js';
import { AnnotationListEntry } from './entries/AnnotationListEntry.js';

const LOW_PRIORITY = 500;

const TARGET_TYPES = [
  'bpmn:Task', 'bpmn:UserTask', 'bpmn:ServiceTask', 'bpmn:SendTask',
  'bpmn:ReceiveTask', 'bpmn:ManualTask', 'bpmn:ScriptTask',
  'bpmn:BusinessRuleTask', 'bpmn:SubProcess',
  'bpmn:DataObjectReference', 'bpmn:DataStoreReference',
  'bpmn:IntermediateThrowEvent', 'bpmn:IntermediateCatchEvent',
  'bpmn:StartEvent', 'bpmn:EndEvent'
];

export default function TerminologyPropertiesProvider(propertiesPanel, translate) {
  propertiesPanel.registerProvider(LOW_PRIORITY, this);
  this._translate = translate;
}

TerminologyPropertiesProvider.$inject = ['propertiesPanel', 'translate'];

TerminologyPropertiesProvider.prototype.getGroups = function (element) {
  const translate = this._translate;

  return function (groups) {
    if (!TARGET_TYPES.some(type => is(element, type))) return groups;

    groups.push({
      id: 'clinical-terminology',
      label: translate('Clinical annotations'),
      entries: [
        {
          id: 'clinical-domain',
          component: ClinicalDomainEntry,
          isEdited: () => !!element.businessObject.get('term:clinicalDomain')
        },
        {
          id: 'clinical-annotations',
          component: AnnotationListEntry,
          isEdited: () => {
            const ext = element.businessObject.extensionElements;
            return ext?.values?.some(v => v.$type === 'term:Annotations' && v.values?.length > 0);
          }
        }
      ]
    });

    return groups;
  };
};
