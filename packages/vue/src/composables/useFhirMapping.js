import { ref, inject } from 'vue';

/**
 * Vue composable for reading FHIR mappings from the currently selected BPMN element.
 *
 * Requires a bpmn-js modeler instance provided via:
 *   app.provide('clinicalBpmnModeler', modeler);
 */
export function useFhirMapping() {
  let getResourceMappings;
  try {
    ({ getResourceMappings } = require('@bpmn-js-clinical-semantics/fhir-mapping'));
  } catch {
    getResourceMappings = () => [];
  }

  const modeler = inject('clinicalBpmnModeler', null);
  const selectedElement = ref(null);
  const mappings = ref([]);

  function init() {
    if (!modeler) return;
    modeler.on('selection.changed', (e) => {
      const el = e.newSelection?.[0];
      selectedElement.value = el || null;
      mappings.value = el ? getResourceMappings(el.businessObject) : [];
    });
  }

  return { selectedElement, mappings, init };
}
