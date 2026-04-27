/**
 * Helper functions for reading and writing fhirmap:resourceMappings
 * on BPMN element businessObjects.
 *
 * FHIR R4 types from @types/fhir are used for JSDoc annotations.
 * When migrating to R5, update the fhir4.* references to fhir5.*.
 *
 * @module MappingHelper
 */

/**
 * @typedef {import('@types/fhir').fhir4.Bundle} FhirBundle
 * @typedef {import('@types/fhir').fhir4.Reference} FhirReference
 */

/**
 * @typedef {Object} KeyElementParams
 * @property {string} path - FHIRPath expression (e.g. 'DiagnosticReport.status')
 * @property {string} [semanticRole] - trigger | filter | classifier | identifier | payload
 * @property {string} [fixedValue] - FHIR-structural constant (mutually exclusive with terminologyBinding)
 * @property {string} [terminologyBinding] - Code system URI; resolved from term:coding at runtime
 * @property {string} [terminologyAspect] - term:annotation aspect to disambiguate (e.g. 'documentType')
 */

/**
 * @typedef {Object} SearchParamParams
 * @property {string} name - FHIR SearchParameter name
 * @property {string} value - Search parameter value
 */

/**
 * @typedef {Object} ResourceMappingParams
 * @property {string} resourceType - FHIR R4 resource type name (e.g. 'DiagnosticReport')
 * @property {string} [profile] - Canonical FHIR profile URL
 * @property {string} [interaction] - FHIR interaction: create | read | update | search | transaction
 * @property {string} [direction] - Data flow: input | output | input-output
 * @property {string} [structureMapRef] - Canonical FHIR StructureMap URL
 * @property {KeyElementParams[]} [keyElements] - Key element bindings
 * @property {SearchParamParams[]} [searchParams] - FHIR SearchParameters
 */

/**
 * @typedef {Object} ExportedKeyElement
 * @property {string} path
 * @property {string} [semanticRole]
 * @property {string} [fixedValue]
 * @property {string} [terminologyBinding]
 * @property {string} [terminologyAspect]
 */

/**
 * @typedef {Object} ExportedMapping
 * @property {string} resourceType
 * @property {string} [profile]
 * @property {string} [interaction]
 * @property {string} [direction]
 * @property {string} [structureMapRef]
 * @property {ExportedKeyElement[]} keyElements
 * @property {SearchParamParams[]} searchParams
 */

/**
 * @typedef {Object} ExportedElement
 * @property {string} id - BPMN element ID
 * @property {string} name - BPMN element name
 * @property {string} type - BPMN element type (e.g. 'bpmn:Task')
 * @property {ExportedMapping[]} fhirMappings
 */

/**
 * @typedef {Object} MappingsExport
 * @property {string} fhirVersion - FHIR version used (e.g. 'R4')
 * @property {ExportedElement[]} elements
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
 * @param {ResourceMappingParams} params
 * @returns {Object} The created fhirmap:ResourceMapping moddle element
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
        terminologyBinding: ke.terminologyBinding || undefined,
        terminologyAspect: ke.terminologyAspect || undefined
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
 *
 * The export includes the active FHIR version for downstream consumers
 * to interpret the resource types and interactions correctly.
 *
 * @param {Object} elementRegistry - bpmn-js element registry
 * @returns {MappingsExport}
 */
export function exportMappingsAsJson(elementRegistry) {
  /** @type {MappingsExport} */
  const result = {
    fhirVersion: 'R4',
    elements: []
  };

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
            terminologyBinding: ke.terminologyBinding,
            terminologyAspect: ke.terminologyAspect
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
