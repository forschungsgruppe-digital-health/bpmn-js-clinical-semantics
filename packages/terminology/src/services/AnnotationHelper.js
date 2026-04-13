/**
 * Helper functions for reading and writing term:annotations
 * on BPMN element businessObjects.
 */

export function getExtensionElement(bo, type) {
  if (!bo.extensionElements) return undefined;
  return bo.extensionElements.values?.find(e => e.$type === type);
}

export function getAnnotationsContainer(bo) {
  return getExtensionElement(bo, 'term:Annotations');
}

export function getAnnotations(bo) {
  const container = getAnnotationsContainer(bo);
  return container?.values || [];
}

export function ensureExtensionElements(bo, moddle) {
  if (!bo.extensionElements) {
    bo.extensionElements = moddle.create('bpmn:ExtensionElements', { values: [] });
  }
  return bo.extensionElements;
}

export function ensureAnnotationsContainer(bo, moddle) {
  const extElements = ensureExtensionElements(bo, moddle);
  let container = getAnnotationsContainer(bo);
  if (!container) {
    container = moddle.create('term:Annotations', { values: [] });
    container.$parent = bo.extensionElements;
    extElements.values.push(container);
  }
  return container;
}

export function addAnnotation(bo, moddle, { aspect, mode, text, codings, target }) {
  const container = ensureAnnotationsContainer(bo, moddle);
  const props = {
    aspect: aspect || 'clinicalContent',
    mode: mode || 'descriptive'
  };
  if (text) props.text = text;

  const annotation = moddle.create('term:Annotation', props);
  annotation.$parent = container;

  if (codings && codings.length > 0) {
    annotation.codings = codings.map(c => {
      const coding = moddle.create('term:Coding', {
        system: c.system,
        code: c.code,
        display: c.display,
        version: c.version || undefined
      });
      coding.$parent = annotation;
      return coding;
    });
  }

  if (target) {
    const mappingTarget = moddle.create('term:MappingTarget', {
      element: target.element,
      transform: target.transform,
      value: target.value || undefined
    });
    mappingTarget.$parent = annotation;
    annotation.target = mappingTarget;
  }

  if (!container.values) container.values = [];
  container.values.push(annotation);
  return annotation;
}

export function removeAnnotation(bo, index) {
  const container = getAnnotationsContainer(bo);
  if (container?.values && index >= 0 && index < container.values.length) {
    container.values.splice(index, 1);
  }
}
