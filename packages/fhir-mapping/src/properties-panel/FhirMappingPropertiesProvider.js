import { is } from 'bpmn-js/lib/util/ModelUtil';
import { FhirMappingListEntry } from './entries/FhirMappingListEntry.js';

const LOW_PRIORITY = 500;

const TARGET_TYPES = [
  'bpmn:Task', 'bpmn:UserTask', 'bpmn:ServiceTask', 'bpmn:SendTask',
  'bpmn:ReceiveTask', 'bpmn:ManualTask', 'bpmn:SubProcess',
  'bpmn:DataObjectReference', 'bpmn:DataStoreReference',
  'bpmn:MessageFlow'
];

export default function FhirMappingPropertiesProvider(propertiesPanel, translate) {
  propertiesPanel.registerProvider(LOW_PRIORITY, this);
  this._translate = translate;
}

FhirMappingPropertiesProvider.$inject = ['propertiesPanel', 'translate'];

FhirMappingPropertiesProvider.prototype.getGroups = function (element) {
  const translate = this._translate;

  return function (groups) {
    if (!TARGET_TYPES.some(type => is(element, type))) return groups;

    groups.push({
      id: 'fhir-mapping',
      label: translate('FHIR Resource Mapping'),
      entries: [
        {
          id: 'fhir-resource-mappings',
          component: FhirMappingListEntry,
          isEdited: () => {
            const ext = element.businessObject.extensionElements;
            return ext?.values?.some(v => v.$type === 'fhirmap:ResourceMappings' && v.mappings?.length > 0);
          }
        }
      ]
    });

    return groups;
  };
};
