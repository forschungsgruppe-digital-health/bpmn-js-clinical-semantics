import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getAnnotations,
  addAnnotation,
  createAnnotationAspectId,
  getUsedAspectIds,
  isValidAspectId,
  removeAnnotation,
  getAnnotationsContainer,
  ensureAnnotationsContainer,
  ensureExtensionElements
} from '../../src/services/AnnotationHelper.js';

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

describe('AnnotationHelper', () => {
  let moddle;

  beforeEach(() => {
    moddle = createMockModdle();
  });

  // ─── getAnnotationsContainer ──────────────────────────────

  describe('getAnnotationsContainer()', () => {
    it('should return undefined if no extensionElements', () => {
      const bo = createBusinessObject();
      expect(getAnnotationsContainer(bo)).toBeUndefined();
    });

    it('should return undefined if no term:Annotations', () => {
      const bo = createBusinessObject({
        values: [{ $type: 'fhirmap:ResourceMappings' }]
      });
      expect(getAnnotationsContainer(bo)).toBeUndefined();
    });

    it('should find and return term:Annotations', () => {
      const container = { $type: 'term:Annotations', values: [] };
      const bo = createBusinessObject({ values: [container] });
      expect(getAnnotationsContainer(bo)).toBe(container);
    });
  });

  // ─── getAnnotations ───────────────────────────────────────

  describe('getAnnotations()', () => {
    it('should return empty array if no container', () => {
      expect(getAnnotations(createBusinessObject())).toEqual([]);
    });

    it('should return annotations from container', () => {
      const annotation1 = { $type: 'term:Annotation', aspect: 'clinicalContent' };
      const annotation2 = { $type: 'term:Annotation', aspect: 'documentType' };
      const container = { $type: 'term:Annotations', values: [annotation1, annotation2] };
      const bo = createBusinessObject({ values: [container] });

      const result = getAnnotations(bo);
      expect(result).toHaveLength(2);
      expect(result[0].aspect).toBe('clinicalContent');
    });
  });

  describe('aspect ID helpers', () => {
    it('should collect used aspect IDs', () => {
      const bo = createBusinessObject({
        values: [{
          $type: 'term:Annotations',
          values: [
            { $type: 'term:Annotation', aspectId: 'clinical-content-1' },
            { $type: 'term:Annotation', aspectId: 'document-type-1' },
            { $type: 'term:Annotation' }
          ]
        }]
      });

      expect(getUsedAspectIds(bo)).toEqual(['clinical-content-1', 'document-type-1']);
    });

    it('should generate the next unique aspect ID for an aspect', () => {
      expect(createAnnotationAspectId('documentType', ['document-type-1', 'document-type-2'])).toBe('document-type-3');
    });

    it('should validate aspect ID format', () => {
      expect(isValidAspectId('document-type_1')).toBe(true);
      expect(isValidAspectId('document type 1')).toBe(false);
    });
  });

  // ─── ensureExtensionElements ──────────────────────────────

  describe('ensureExtensionElements()', () => {
    it('should create extensionElements if not present', () => {
      const bo = createBusinessObject();
      const ext = ensureExtensionElements(bo, moddle);
      expect(ext.$type).toBe('bpmn:ExtensionElements');
      expect(ext.values).toEqual([]);
      expect(bo.extensionElements).toBe(ext);
    });

    it('should return existing extensionElements', () => {
      const existing = { $type: 'bpmn:ExtensionElements', values: [{ $type: 'term:Annotations' }] };
      const bo = createBusinessObject(existing);
      const ext = ensureExtensionElements(bo, moddle);
      expect(ext).toBe(existing);
    });
  });

  // ─── ensureAnnotationsContainer ───────────────────────────

  describe('ensureAnnotationsContainer()', () => {
    it('should create extensionElements and Annotations container if none exist', () => {
      const bo = createBusinessObject();
      const container = ensureAnnotationsContainer(bo, moddle);
      expect(container.$type).toBe('term:Annotations');
      expect(container.values).toEqual([]);
      expect(bo.extensionElements.values).toContain(container);
    });

    it('should return existing Annotations container', () => {
      const existingContainer = { $type: 'term:Annotations', values: [] };
      const bo = createBusinessObject({ values: [existingContainer] });
      const container = ensureAnnotationsContainer(bo, moddle);
      expect(container).toBe(existingContainer);
    });
  });

  // ─── addAnnotation ────────────────────────────────────────

  describe('addAnnotation()', () => {
    it('should add a basic annotation with aspect', () => {
      const bo = createBusinessObject();
      const annotation = addAnnotation(bo, moddle, {
        aspect: 'clinicalContent',
        text: 'CT-Thorax mit Kontrastmittel'
      });

      expect(annotation.$type).toBe('term:Annotation');
      expect(annotation.aspect).toBe('clinicalContent');
      expect(annotation.aspectId).toBe('clinical-content-1');
      expect(annotation.mode).toBeUndefined();
      expect(annotation.text).toBe('CT-Thorax mit Kontrastmittel');
      expect(getAnnotations(bo)).toHaveLength(1);
    });

    it('should default aspect to clinicalContent', () => {
      const bo = createBusinessObject();
      const annotation = addAnnotation(bo, moddle, {});
      expect(annotation.aspect).toBe('clinicalContent');
      expect(annotation.aspectId).toBe('clinical-content-1');
      expect(annotation.mode).toBeUndefined();
    });

    it('should keep a manually provided aspect ID', () => {
      const bo = createBusinessObject();
      const annotation = addAnnotation(bo, moddle, {
        aspect: 'documentType',
        aspectId: 'thorax-report-type'
      });

      expect(annotation.aspectId).toBe('thorax-report-type');
    });

    it('should add codings', () => {
      const bo = createBusinessObject();
      const annotation = addAnnotation(bo, moddle, {
        aspect: 'clinicalContent',
        codings: [
          { system: 'http://snomed.info/sct', code: '169069000', display: 'CT of chest' },
          { system: 'http://fhir.de/CodeSystem/bfarm/ops', code: '3-222', display: 'CT Thorax' }
        ]
      });

      expect(annotation.codings).toHaveLength(2);
      expect(annotation.codings[0].$type).toBe('term:Coding');
      expect(annotation.codings[0].code).toBe('169069000');
      expect(annotation.codings[0].system).toBe('http://snomed.info/sct');
      expect(annotation.codings[1].code).toBe('3-222');
    });

    it('should add a mapping target', () => {
      const bo = createBusinessObject();
      const annotation = addAnnotation(bo, moddle, {
        aspect: 'documentType',
        target: {
          element: 'DocumentReference.type',
          transform: 'copy'
        }
      });

      expect(annotation.target.$type).toBe('term:MappingTarget');
      expect(annotation.target.element).toBe('DocumentReference.type');
      expect(annotation.target.transform).toBe('copy');
    });

    it('should add multiple annotations to the same element', () => {
      const bo = createBusinessObject();
      addAnnotation(bo, moddle, { aspect: 'clinicalContent', text: 'First' });
      addAnnotation(bo, moddle, { aspect: 'documentType', text: 'Second' });

      const annotations = getAnnotations(bo);
      expect(annotations).toHaveLength(2);
      expect(annotations[0].aspectId).toBe('clinical-content-1');
      expect(annotations[1].aspectId).toBe('document-type-1');
    });

    it('should set $parent references correctly', () => {
      const bo = createBusinessObject();
      const annotation = addAnnotation(bo, moddle, {
        codings: [{ system: 'http://snomed.info/sct', code: '123' }],
        target: { element: 'Resource.code', transform: 'copy' }
      });

      expect(annotation.$parent.$type).toBe('term:Annotations');
      expect(annotation.codings[0].$parent).toBe(annotation);
      expect(annotation.target.$parent).toBe(annotation);
    });
  });

  // ─── removeAnnotation ─────────────────────────────────────

  describe('removeAnnotation()', () => {
    it('should remove annotation at given index', () => {
      const bo = createBusinessObject();
      addAnnotation(bo, moddle, { text: 'First' });
      addAnnotation(bo, moddle, { text: 'Second' });
      addAnnotation(bo, moddle, { text: 'Third' });

      removeAnnotation(bo, 1);
      const annotations = getAnnotations(bo);
      expect(annotations).toHaveLength(2);
      expect(annotations[0].text).toBe('First');
      expect(annotations[1].text).toBe('Third');
    });

    it('should handle out-of-bounds index gracefully', () => {
      const bo = createBusinessObject();
      addAnnotation(bo, moddle, { text: 'Only' });
      removeAnnotation(bo, 5); // out of bounds
      expect(getAnnotations(bo)).toHaveLength(1);
    });

    it('should handle negative index gracefully', () => {
      const bo = createBusinessObject();
      addAnnotation(bo, moddle, { text: 'Only' });
      removeAnnotation(bo, -1);
      expect(getAnnotations(bo)).toHaveLength(1);
    });

    it('should handle missing container gracefully', () => {
      const bo = createBusinessObject();
      expect(() => removeAnnotation(bo, 0)).not.toThrow();
    });

    it('should clear matching FHIR terminology bindings when removing an annotation', () => {
      const bo = createBusinessObject({
        values: [
          {
            $type: 'term:Annotations',
            values: [
              { $type: 'term:Annotation', aspectId: 'document-type-1', text: 'First' }
            ]
          },
          {
            $type: 'fhirmap:ResourceMappings',
            mappings: [
              {
                $type: 'fhirmap:ResourceMapping',
                keyElements: [
                  { $type: 'fhirmap:KeyElement', path: 'DocumentReference.type', terminologyBinding: 'document-type-1' },
                  { $type: 'fhirmap:KeyElement', path: 'DocumentReference.status', terminologyBinding: 'status-1' }
                ]
              }
            ]
          }
        ]
      });

      removeAnnotation(bo, 0);

      const keyElements = bo.extensionElements.values[1].mappings[0].keyElements;
      expect(keyElements[0].terminologyBinding).toBeUndefined();
      expect(keyElements[1].terminologyBinding).toBe('status-1');
    });
  });
});
