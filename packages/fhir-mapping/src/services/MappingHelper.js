/**
 * Helper functions for reading and writing fhirmap:resourceMappings
 * on BPMN element businessObjects.
 */

export function getResourceMappingsContainer(bo) {
  if (!bo.extensionElements) return undefined;
  return bo.extensionElements.values?.find(e => e.$type === 'fhirmap:ResourceMappings');
}

export function getResourceMappings(bo) {
  const container = getResourceMappingsContainer(bo);
  return container?.mappings || [];
}

function ensureExtensionElements(bo, moddle) {
  if (!bo.extensionElements) {
    bo.extensionElements = moddle.create('bpmn:ExtensionElements', { values: [] });
  }
  return bo.extensionElements;
}

function ensureResourceMappingsContainer(bo, moddle) {
  const extElements = ensureExtensionElements(bo, moddle);
  let container = getResourceMappingsContainer(bo);
  if (!container) {
    container = moddle.create('fhirmap:ResourceMappings', { mappings: [] });
    container.$parent = bo.extensionElements;
    extElements.values.push(container);
  }
  return container;
}

/**
 * Add a FHIR resource mapping to a BPMN element.
 *
 * @param {Object} bo - businessObject
 * @param {Object} moddle - bpmn-moddle instance
 * @param {Object} params
 * @param {string} params.resourceType - e.g. 'DiagnosticReport'
 * @param {string} [params.profile] - Canonical profile URL
 * @param {string} [params.interaction] - create | read | update | search
 * @param {string} [params.direction] - input | output | input-output
 * @param {string} [params.structureMapRef] - Canonical StructureMap URL
 * @param {Array} [params.keyElements] - [{ path, semanticRole, fixedValue?, terminologyBinding? }]
 * @param {Array} [params.searchParams] - [{ name, value }]
 */
export function addResourceMapping(bo, moddle, params) {
  const container = ensureResourceMappingsContainer(bo, moddle);

  const mappingProps = {
    resourceType: params.resourceType,
    profile: params.profile || undefined,
    interaction: params.interaction || undefined,
    direction: params.direction || undefined,
    structureMapRef: params.structureMapRef || undefined
  };

  const mapping = moddle.create('fhirmap:ResourceMapping', mappingProps);
  mapping.$parent = container;

  if (params.keyElements?.length > 0) {
    mapping.keyElements = params.keyElements.map(ke => {
      const keyElement = moddle.create('fhirmap:KeyElement', {
        path: ke.path,
        semanticRole: ke.semanticRole || undefined,
        fixedValue: ke.fixedValue || undefined,
        terminologyBinding: ke.terminologyBinding || undefined
      });
      keyElement.$parent = mapping;
      return keyElement;
    });
  }

  if (params.searchParams?.length > 0) {
    mapping.searchParams = params.searchParams.map(sp => {
      const searchParam = moddle.create('fhirmap:SearchParam', {
        name: sp.name,
        value: sp.value
      });
      searchParam.$parent = mapping;
      return searchParam;
    });
  }

  if (!container.mappings) container.mappings = [];
  container.mappings.push(mapping);
  return mapping;
}

export function removeResourceMapping(bo, index) {
  const container = getResourceMappingsContainer(bo);
  if (container?.mappings && index >= 0 && index < container.mappings.length) {
    container.mappings.splice(index, 1);
  }
}

/**
 * Export all FHIR mappings from a BPMN model as JSON.
 */
export function exportMappingsAsJson(elementRegistry) {
  const result = { elements: [] };
  elementRegistry.forEach(element => {
    const bo = element.businessObject;
    const mappings = getResourceMappings(bo);
    if (mappings.length > 0) {
      result.elements.push({
        id: bo.id,
        name: bo.name,
        type: bo.$type,
        fhirMappings: mappings.map(m => ({
          resourceType: m.resourceType,
          profile: m.profile,
          interaction: m.interaction,
          direction: m.direction,
          structureMapRef: m.structureMapRef,
          keyElements: (m.keyElements || []).map(ke => ({
            path: ke.path,
            semanticRole: ke.semanticRole,
            fixedValue: ke.fixedValue,
            terminologyBinding: ke.terminologyBinding
          })),
          searchParams: (m.searchParams || []).map(sp => ({
            name: sp.name,
            value: sp.value
          }))
        }))
      });
    }
  });
  return result;
}
