import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getResourceMappings,
  getBindableTerminologyAnnotations,
  addResourceMapping,
  removeResourceMapping,
  exportMappingsAsJson
} from '../../src/services/MappingHelper.js';

/**
 * Minimal mock for bpmn-moddle's create() method.
 */
function createMockModdle() {
  return {
    create(type, props = {}) {
      return { $type: type, ...props };
    }
  };
}

function createBusinessObject(extensionElements = undefined) {
  return { extensionElements };
}

describe('MappingHelper', () => {
  let moddle;

  beforeEach(() => {
    moddle = createMockModdle();
  });

  // ─── getResourceMappings ──────────────────────────────────

  describe('getResourceMappings()', () => {
    it('should return empty array if no extensionElements', () => {
      const bo = createBusinessObject();
      expect(getResourceMappings(bo)).toEqual([]);
    });

    it('should return empty array if no fhirmap:ResourceMappings', () => {
      const bo = createBusinessObject({
        values: [{ $type: 'term:Annotations' }]
      });
      expect(getResourceMappings(bo)).toEqual([]);
    });

    it('should return mappings from container', () => {
      const mapping1 = { $type: 'fhirmap:ResourceMapping', resourceType: 'Condition' };
      const mapping2 = { $type: 'fhirmap:ResourceMapping', resourceType: 'Procedure' };
      const container = { $type: 'fhirmap:ResourceMappings', mappings: [mapping1, mapping2] };
      const bo = createBusinessObject({ values: [container] });

      const result = getResourceMappings(bo);
      expect(result).toHaveLength(2);
      expect(result[0].resourceType).toBe('Condition');
      expect(result[1].resourceType).toBe('Procedure');
    });
  });

  describe('getBindableTerminologyAnnotations()', () => {
    it('should return terminology annotations with aspect IDs from the same business object', () => {
      const bo = createBusinessObject({
        values: [
          {
            $type: 'term:Annotations',
            values: [
              { $type: 'term:Annotation', aspect: 'documentType', aspectId: 'document-type-1', text: 'Discharge summary' },
              { $type: 'term:Annotation', aspect: 'documentClass' }
            ]
          }
        ]
      });

      expect(getBindableTerminologyAnnotations(bo)).toEqual([
        {
          aspect: 'documentType',
          aspectId: 'document-type-1',
          text: 'Discharge summary',
          codings: []
        }
      ]);
    });
  });

  // ─── addResourceMapping ───────────────────────────────────

  describe('addResourceMapping()', () => {
    it('should add a basic resource mapping', () => {
      const bo = createBusinessObject();
      const mapping = addResourceMapping(bo, moddle, {
        resourceType: 'DiagnosticReport',
        interaction: 'create',
        direction: 'output'
      });

      expect(mapping.$type).toBe('fhirmap:ResourceMapping');
      expect(mapping.resourceType).toBe('DiagnosticReport');
      expect(mapping.interaction).toBe('create');
      expect(mapping.direction).toBe('output');
      expect(getResourceMappings(bo)).toHaveLength(1);
    });

    it('should create extensionElements and container if needed', () => {
      const bo = createBusinessObject();
      addResourceMapping(bo, moddle, { resourceType: 'Condition' });
      expect(bo.extensionElements.$type).toBe('bpmn:ExtensionElements');
      expect(bo.extensionElements.values[0].$type).toBe('fhirmap:ResourceMappings');
    });

    it('should add profile and structureMapRef', () => {
      const bo = createBusinessObject();
      const mapping = addResourceMapping(bo, moddle, {
        resourceType: 'Condition',
        profile: 'https://fhir.example.com/StructureDefinition/Condition',
        structureMapRef: 'https://fhir.example.com/StructureMap/ConditionMap'
      });

      expect(mapping.profile).toBe('https://fhir.example.com/StructureDefinition/Condition');
      expect(mapping.structureMapRef).toBe('https://fhir.example.com/StructureMap/ConditionMap');
    });

    it('should add keyElements with semantic roles', () => {
      const bo = createBusinessObject();
      const mapping = addResourceMapping(bo, moddle, {
        resourceType: 'DiagnosticReport',
        keyElements: [
          { path: 'DiagnosticReport.status', semanticRole: 'trigger', fixedValue: 'final' },
          { path: 'DiagnosticReport.code', semanticRole: 'classifier', terminologyBinding: 'document-type-1' }
        ]
      });

      expect(mapping.keyElements).toHaveLength(2);
      expect(mapping.keyElements[0].$type).toBe('fhirmap:KeyElement');
      expect(mapping.keyElements[0].path).toBe('DiagnosticReport.status');
      expect(mapping.keyElements[0].semanticRole).toBe('trigger');
      expect(mapping.keyElements[0].fixedValue).toBe('final');
      expect(mapping.keyElements[1].terminologyBinding).toBe('document-type-1');
    });

    it('should add searchParams', () => {
      const bo = createBusinessObject();
      const mapping = addResourceMapping(bo, moddle, {
        resourceType: 'Observation',
        interaction: 'search',
        searchParams: [
          { name: 'code', value: '85354-9' },
          { name: 'patient', value: '{{Patient.id}}' }
        ]
      });

      expect(mapping.searchParams).toHaveLength(2);
      expect(mapping.searchParams[0].$type).toBe('fhirmap:SearchParam');
      expect(mapping.searchParams[0].name).toBe('code');
      expect(mapping.searchParams[0].value).toBe('85354-9');
    });

    it('should add multiple mappings to the same element', () => {
      const bo = createBusinessObject();
      addResourceMapping(bo, moddle, { resourceType: 'Condition' });
      addResourceMapping(bo, moddle, { resourceType: 'Procedure' });
      addResourceMapping(bo, moddle, { resourceType: 'DocumentReference' });

      expect(getResourceMappings(bo)).toHaveLength(3);
    });

    it('should set $parent references correctly', () => {
      const bo = createBusinessObject();
      const mapping = addResourceMapping(bo, moddle, {
        resourceType: 'Observation',
        keyElements: [{ path: 'Observation.code' }],
        searchParams: [{ name: 'code', value: '123' }]
      });

      expect(mapping.$parent.$type).toBe('fhirmap:ResourceMappings');
      expect(mapping.keyElements[0].$parent).toBe(mapping);
      expect(mapping.searchParams[0].$parent).toBe(mapping);
    });

    it('should handle undefined optional fields as undefined', () => {
      const bo = createBusinessObject();
      const mapping = addResourceMapping(bo, moddle, {
        resourceType: 'Patient'
      });

      expect(mapping.profile).toBeUndefined();
      expect(mapping.interaction).toBeUndefined();
      expect(mapping.direction).toBeUndefined();
      expect(mapping.structureMapRef).toBeUndefined();
    });
  });

  // ─── removeResourceMapping ────────────────────────────────

  describe('removeResourceMapping()', () => {
    it('should remove mapping at given index', () => {
      const bo = createBusinessObject();
      addResourceMapping(bo, moddle, { resourceType: 'Condition' });
      addResourceMapping(bo, moddle, { resourceType: 'Procedure' });
      addResourceMapping(bo, moddle, { resourceType: 'Observation' });

      removeResourceMapping(bo, 1);
      const mappings = getResourceMappings(bo);
      expect(mappings).toHaveLength(2);
      expect(mappings[0].resourceType).toBe('Condition');
      expect(mappings[1].resourceType).toBe('Observation');
    });

    it('should handle out-of-bounds index gracefully', () => {
      const bo = createBusinessObject();
      addResourceMapping(bo, moddle, { resourceType: 'Condition' });
      removeResourceMapping(bo, 10);
      expect(getResourceMappings(bo)).toHaveLength(1);
    });

    it('should handle negative index gracefully', () => {
      const bo = createBusinessObject();
      addResourceMapping(bo, moddle, { resourceType: 'Condition' });
      removeResourceMapping(bo, -1);
      expect(getResourceMappings(bo)).toHaveLength(1);
    });

    it('should handle missing container gracefully', () => {
      const bo = createBusinessObject();
      expect(() => removeResourceMapping(bo, 0)).not.toThrow();
    });
  });

  // ─── exportMappingsAsJson ─────────────────────────────────

  describe('exportMappingsAsJson()', () => {
    it('should export all elements with FHIR mappings', () => {
      const bo1 = createBusinessObject();
      addResourceMapping(bo1, moddle, {
        resourceType: 'DiagnosticReport',
        interaction: 'create',
        direction: 'output',
        keyElements: [{ path: 'DiagnosticReport.status', semanticRole: 'trigger', fixedValue: 'final' }],
        searchParams: [{ name: 'patient', value: '{{Patient.id}}' }]
      });

      const bo2 = createBusinessObject(); // no mappings

      const elementRegistry = {
        forEach(callback) {
          callback({ businessObject: { id: 'Task_1', name: 'CT-Thorax', $type: 'bpmn:Task', ...bo1 } });
          callback({ businessObject: { id: 'Task_2', name: 'Assessment', $type: 'bpmn:Task', ...bo2 } });
        }
      };

      const result = exportMappingsAsJson(elementRegistry);
      expect(result.fhirVersion).toBe('R4');
      expect(result.elements).toHaveLength(1);
      expect(result.elements[0].id).toBe('Task_1');
      expect(result.elements[0].name).toBe('CT-Thorax');
      expect(result.elements[0].fhirMappings).toHaveLength(1);
      expect(result.elements[0].fhirMappings[0].resourceType).toBe('DiagnosticReport');
      expect(result.elements[0].fhirMappings[0].keyElements[0].path).toBe('DiagnosticReport.status');
      expect(result.elements[0].fhirMappings[0].searchParams[0].name).toBe('patient');
    });

    it('should return empty elements array if no mappings exist', () => {
      const elementRegistry = {
        forEach(callback) {
          callback({ businessObject: { id: 'Task_1', name: 'Test', $type: 'bpmn:Task' } });
        }
      };

      const result = exportMappingsAsJson(elementRegistry);
      expect(result.fhirVersion).toBe('R4');
      expect(result.elements).toEqual([]);
    });

    it('should export multiple mappings per element', () => {
      const bo = createBusinessObject();
      addResourceMapping(bo, moddle, { resourceType: 'Condition' });
      addResourceMapping(bo, moddle, { resourceType: 'Procedure' });

      const elementRegistry = {
        forEach(callback) {
          callback({ businessObject: { id: 'Task_1', name: 'Test', $type: 'bpmn:Task', ...bo } });
        }
      };

      const result = exportMappingsAsJson(elementRegistry);
      expect(result.elements[0].fhirMappings).toHaveLength(2);
    });
  });
});
