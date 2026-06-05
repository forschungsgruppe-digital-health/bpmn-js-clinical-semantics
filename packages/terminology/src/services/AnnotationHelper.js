/**
 * Helper functions for reading and writing term:annotations
 * on BPMN element businessObjects.
 */

const DEFAULT_ASPECT = 'clinicalContent';
const ASPECT_ID_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?$/;

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

export function getUsedAspectIds(bo) {
  return getAnnotations(bo)
    .map(annotation => annotation.aspectId)
    .filter(Boolean);
}

export function isValidAspectId(aspectId) {
  return ASPECT_ID_PATTERN.test((aspectId || '').trim());
}

export function createAnnotationAspectId(aspect = DEFAULT_ASPECT, existingIds = []) {
  const normalizedBase = normalizeAspectIdBase(aspect);
  const idsInUse = new Set(existingIds.filter(Boolean));

  let sequence = 1;
  let candidate = `${normalizedBase}-${sequence}`;

  while (idsInUse.has(candidate)) {
    sequence += 1;
    candidate = `${normalizedBase}-${sequence}`;
  }

  return candidate;
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

export function addAnnotation(bo, moddle, { aspect, aspectId, text, codings, target, existingAspectIds }) {
  const container = ensureAnnotationsContainer(bo, moddle);
  const resolvedAspect = aspect || DEFAULT_ASPECT;
  const props = {
    aspect: resolvedAspect,
    aspectId: (aspectId || '').trim() || createAnnotationAspectId(
      resolvedAspect,
      existingAspectIds || getUsedAspectIds(bo)
    )
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
    const [removedAnnotation] = container.values.splice(index, 1);
    clearTerminologyBindings(bo, removedAnnotation?.aspectId);
  }
}

function normalizeAspectIdBase(aspect) {
  const normalizedAspect = String(aspect || DEFAULT_ASPECT)
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

  return normalizedAspect || 'annotation';
}

function clearTerminologyBindings(bo, aspectId) {
  if (!aspectId || !bo.extensionElements?.values) {
    return;
  }

  bo.extensionElements.values
    .filter((value) => value.$type === 'fhirmap:ResourceMappings')
    .forEach((container) => {
      (container.mappings || []).forEach((mapping) => {
        (mapping.keyElements || []).forEach((keyElement) => {
          if (keyElement.terminologyBinding === aspectId) {
            keyElement.terminologyBinding = undefined;
          }
        });
      });
    });
}
