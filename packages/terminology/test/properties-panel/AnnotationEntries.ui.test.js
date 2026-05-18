// @vitest-environment jsdom

import { h } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/preact';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { BpmnModdle } from 'bpmn-moddle';

const serviceState = vi.hoisted(() => ({
  current: {}
}));

vi.mock('bpmn-js-properties-panel', () => ({
  useService(name, strict = true) {
    if (name in serviceState.current) {
      return serviceState.current[name];
    }

    if (strict === false) {
      return undefined;
    }

    throw new Error(`Missing mocked service: ${name}`);
  }
}));

vi.mock('@bpmn-io/properties-panel/preact/hooks', () => ({
  useEffect,
  useRef,
  useState
}));

const PROVIDERS = [
  { id: 'snomed-ct', displayName: 'SNOMED CT', systemUri: 'http://snomed.info/sct' },
  { id: 'loinc', displayName: 'LOINC', systemUri: 'http://loinc.org' },
  { id: 'ops', displayName: 'OPS', systemUri: 'http://fhir.de/CodeSystem/bfarm/ops' },
  { id: 'atc', displayName: 'ATC', systemUri: 'http://www.whocc.no/atc' },
  { id: 'kdl', displayName: 'KDL', systemUri: 'http://dvmd.de/fhir/CodeSystem/kdl' },
  { id: 'ihe-xds-type', displayName: 'IHE XDS typeCode', systemUri: 'http://ihe-d.de/CodeSystems/IHEXDStypeCode' },
  { id: 'ihe-xds-class', displayName: 'IHE XDS classCode', systemUri: 'http://ihe-d.de/CodeSystems/IHEXDSclassCode' }
];

const SEARCH_RESULTS = {
  'snomed-ct': [
    { code: '254292007', display: 'Tumor staging (tumor staging)', system: 'http://snomed.info/sct' },
    { code: '367336001', display: 'Chemotherapy (procedure)', system: 'http://snomed.info/sct' },
    { code: '359615001', display: 'Partial lobectomy of lung (procedure)', system: 'http://snomed.info/sct' },
    { code: '390906007', display: 'Follow-up encounter (procedure)', system: 'http://snomed.info/sct' }
  ],
  loinc: [
    { code: '21908-9', display: 'Stage group.clinical Cancer', system: 'http://loinc.org' },
    { code: '18748-4', display: 'Diagnostic imaging study', system: 'http://loinc.org' },
    { code: '18842-5', display: 'Discharge summary', system: 'http://loinc.org' },
    { code: '18776-5', display: 'Plan of care note', system: 'http://loinc.org' }
  ],
  ops: [
    { code: '5-324', display: 'Simple lobectomy and bilobectomy of the lung', system: 'http://fhir.de/CodeSystem/bfarm/ops' }
  ],
  atc: [
    { code: 'L01XA01', display: 'Cisplatin', system: 'http://www.whocc.no/atc' }
  ],
  kdl: [
    { code: 'AD010101', display: 'Medical discharge report', system: 'http://dvmd.de/fhir/CodeSystem/kdl' }
  ],
  'ihe-xds-type': [
    { code: 'ERGE', display: 'Diagnostic imaging results', system: 'http://ihe-d.de/CodeSystems/IHEXDStypeCode' }
  ],
  'ihe-xds-class': [
    { code: 'BEF', display: 'Clinical reports', system: 'http://ihe-d.de/CodeSystems/IHEXDSclassCode' },
    { code: 'BRI', display: 'Physician letters', system: 'http://ihe-d.de/CodeSystems/IHEXDSclassCode' }
  ]
};

let AnnotationListEntry;
let ClinicalDomainEntry;

describe('terminology properties panel UI', () => {
  beforeAll(async () => {
    ({ AnnotationListEntry } = await import('../../src/properties-panel/entries/AnnotationListEntry.js'));
    ({ ClinicalDomainEntry } = await import('../../src/properties-panel/entries/ClinicalDomainEntry.js'));
  });

  beforeEach(() => {
    globalThis.requestAnimationFrame = (callback) => {
      callback();
      return 0;
    };

    globalThis.cancelAnimationFrame = () => {};
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    cleanup();
    serviceState.current = {};
  });

  it('recreates the staging task terminology annotation via the UI', async () => {
    const context = await createTestContext({
      id: 'Task_Staging',
      type: 'bpmn:Task',
      name: 'Perform TNM Staging'
    });

    setServices(context);

    const clinicalDomainView = render(h(ClinicalDomainEntry, { element: context.element }));
    fireEvent.change(screen.getByLabelText('Clinical domain'), {
      target: { value: 'staging' }
    });
    clinicalDomainView.unmount();

    const annotationView = render(h(AnnotationListEntry, { element: context.element }));
    await createAnnotation(annotationView.container, {
      text: 'Clinical TNM staging to determine tumor stage',
      codings: [
        {
          providerId: 'snomed-ct',
          searchTerm: 'Tumor staging',
          resultLabel: 'Tumor staging (tumor staging)'
        },
        {
          providerId: 'loinc',
          searchTerm: 'Stage group',
          resultLabel: 'Stage group.clinical Cancer'
        }
      ]
    });

    const xml = await serializeXml(context.moddle, context.definitions);
    maybePrintXml('Task_Staging', xml);

    expect(xml).toContain('id="Task_Staging"');
    expect(xml).toContain('term:clinicalDomain="staging"');
    expect(xml).toContain('<term:annotation aspect="clinicalContent" mode="descriptive" text="Clinical TNM staging to determine tumor stage">');
    expect(xml).toContain('<term:coding system="http://snomed.info/sct" code="254292007" display="Tumor staging (tumor staging)"');
    expect(xml).toContain('<term:coding system="http://loinc.org" code="21908-9" display="Stage group.clinical Cancer"');
    expect(xml).not.toContain('fhirmap:');
  });

  it('recreates the chemotherapy task without adding a mapping target', async () => {
    const context = await createTestContext({
      id: 'Task_Chemo',
      type: 'bpmn:Task',
      name: 'Systemic Chemotherapy'
    });

    setServices(context);

    const clinicalDomainView = render(h(ClinicalDomainEntry, { element: context.element }));
    fireEvent.change(screen.getByLabelText('Clinical domain'), {
      target: { value: 'therapy' }
    });
    clinicalDomainView.unmount();

    const annotationView = render(h(AnnotationListEntry, { element: context.element }));
    await createAnnotation(annotationView.container, {
      mode: 'prescriptive',
      text: 'Cisplatin-based doublet chemotherapy for inoperable lung cancer Stage III-IV',
      codings: [
        {
          providerId: 'snomed-ct',
          searchTerm: 'Chemotherapy',
          resultLabel: 'Chemotherapy (procedure)'
        },
        {
          providerId: 'atc',
          searchTerm: 'Cisplatin',
          resultLabel: 'Cisplatin'
        }
      ]
    });

    const xml = await serializeXml(context.moddle, context.definitions);
    maybePrintXml('Task_Chemo', xml);

    expect(xml).toContain('id="Task_Chemo"');
    expect(xml).toContain('term:clinicalDomain="therapy"');
    expect(xml).toContain('<term:annotation aspect="clinicalContent" mode="prescriptive" text="Cisplatin-based doublet chemotherapy for inoperable lung cancer Stage III-IV">');
    expect(xml).toContain('<term:coding system="http://snomed.info/sct" code="367336001" display="Chemotherapy (procedure)"');
    expect(xml).toContain('<term:coding system="http://www.whocc.no/atc" code="L01XA01" display="Cisplatin"');
    expect(xml).not.toContain('<term:target');
  });

  it('recreates the discharge letter data object annotations via the UI', async () => {
    const context = await createTestContext({
      id: 'DataObj_DischargeLetter',
      type: 'bpmn:DataObjectReference',
      name: 'Discharge Letter'
    });

    setServices(context);

    const clinicalDomainView = render(h(ClinicalDomainEntry, { element: context.element }));
    fireEvent.change(screen.getByLabelText('Clinical domain'), {
      target: { value: 'documentation' }
    });
    clinicalDomainView.unmount();

    const annotationView = render(h(AnnotationListEntry, { element: context.element }));

    await createAnnotation(annotationView.container, {
      aspect: 'documentType',
      mode: 'prescriptive',
      text: 'Medical discharge report upon completion of follow-up',
      codings: [
        {
          providerId: 'loinc',
          searchTerm: 'Discharge',
          resultLabel: 'Discharge summary'
        },
        {
          providerId: 'kdl',
          searchTerm: 'Medical discharge',
          resultLabel: 'Medical discharge report'
        }
      ]
    });

    await createAnnotation(annotationView.container, {
      aspect: 'documentClass',
      mode: 'prescriptive',
      codings: [
        {
          providerId: 'ihe-xds-class',
          searchTerm: 'Physician',
          resultLabel: 'Physician letters'
        }
      ]
    });

    const xml = await serializeXml(context.moddle, context.definitions);
    maybePrintXml('DataObj_DischargeLetter', xml);

    expect(xml).toContain('id="DataObj_DischargeLetter"');
    expect(xml).toContain('term:clinicalDomain="documentation"');
    expect(xml).toContain('<term:annotation aspect="documentType" mode="prescriptive" text="Medical discharge report upon completion of follow-up">');
    expect(xml).toContain('<term:coding system="http://loinc.org" code="18842-5" display="Discharge summary"');
    expect(xml).toContain('<term:coding system="http://dvmd.de/fhir/CodeSystem/kdl" code="AD010101" display="Medical discharge report"');
    expect(xml).toContain('<term:annotation aspect="documentClass" mode="prescriptive">');
    expect(xml).toContain('<term:coding system="http://ihe-d.de/CodeSystems/IHEXDSclassCode" code="BRI" display="Physician letters"');
  });

  it('recreates the MRI data object annotations via the UI', async () => {
    const context = await createTestContext({
      id: 'DataObj_MRI',
      type: 'bpmn:DataObjectReference',
      name: 'MRI Scan Report'
    });

    setServices(context);

    const clinicalDomainView = render(h(ClinicalDomainEntry, { element: context.element }));
    fireEvent.change(screen.getByLabelText('Clinical domain'), {
      target: { value: 'diagnostics' }
    });
    clinicalDomainView.unmount();

    const annotationView = render(h(AnnotationListEntry, { element: context.element }));

    await createAnnotation(annotationView.container, {
      aspect: 'documentType',
      mode: 'prescriptive',
      text: 'MRI scan report of the thorax as input document for TNM staging',
      codings: [
        {
          providerId: 'loinc',
          searchTerm: 'Diagnostic imaging',
          resultLabel: 'Diagnostic imaging study'
        },
        {
          providerId: 'ihe-xds-type',
          searchTerm: 'Diagnostic imaging',
          resultLabel: 'Diagnostic imaging results'
        }
      ]
    });

    await createAnnotation(annotationView.container, {
      aspect: 'documentClass',
      mode: 'prescriptive',
      codings: [
        {
          providerId: 'ihe-xds-class',
          searchTerm: 'Clinical reports',
          resultLabel: 'Clinical reports'
        }
      ]
    });

    const xml = await serializeXml(context.moddle, context.definitions);
    maybePrintXml('DataObj_MRI', xml);

    expect(xml).toContain('id="DataObj_MRI"');
    expect(xml).toContain('term:clinicalDomain="diagnostics"');
    expect(xml).toContain('<term:annotation aspect="documentType" mode="prescriptive" text="MRI scan report of the thorax as input document for TNM staging">');
    expect(xml).toContain('<term:coding system="http://loinc.org" code="18748-4" display="Diagnostic imaging study"');
    expect(xml).toContain('<term:coding system="http://ihe-d.de/CodeSystems/IHEXDStypeCode" code="ERGE" display="Diagnostic imaging results"');
    expect(xml).toContain('<term:coding system="http://ihe-d.de/CodeSystems/IHEXDSclassCode" code="BEF" display="Clinical reports"');
  });

  it('recreates the terminology-only reference cross section via the UI', async () => {
    const context = await createProcessContext([
      { id: 'DataObj_MRI', type: 'bpmn:DataObjectReference', name: 'MRI Scan Report' },
      { id: 'Task_Staging', type: 'bpmn:Task', name: 'Perform TNM Staging' },
      { id: 'Gateway_Split', type: 'bpmn:ExclusiveGateway', name: 'Tumor Stage?' },
      { id: 'Task_Surgery', type: 'bpmn:Task', name: 'Surgical Resection' },
      { id: 'Task_Chemo', type: 'bpmn:Task', name: 'Systemic Chemotherapy' },
      { id: 'DataObj_DischargeLetter', type: 'bpmn:DataObjectReference', name: 'Discharge Letter' },
      { id: 'Task_Followup', type: 'bpmn:Task', name: 'Follow-up Assessment' }
    ]);

    setServices(context);

    await setClinicalDomain(context, 'DataObj_MRI', 'diagnostics');
    await addAnnotationToElement(context, 'DataObj_MRI', {
      aspect: 'documentType',
      mode: 'prescriptive',
      text: 'MRI scan report of the thorax as input document for TNM staging',
      codings: [
        {
          providerId: 'loinc',
          searchTerm: 'Diagnostic imaging',
          resultLabel: 'Diagnostic imaging study'
        },
        {
          providerId: 'ihe-xds-type',
          searchTerm: 'Diagnostic imaging',
          resultLabel: 'Diagnostic imaging results'
        }
      ]
    });
    await addAnnotationToElement(context, 'DataObj_MRI', {
      aspect: 'documentClass',
      mode: 'prescriptive',
      codings: [
        {
          providerId: 'ihe-xds-class',
          searchTerm: 'Clinical reports',
          resultLabel: 'Clinical reports'
        }
      ]
    });

    await setClinicalDomain(context, 'Task_Staging', 'staging');
    await addAnnotationToElement(context, 'Task_Staging', {
      text: 'Clinical TNM staging to determine tumor stage',
      codings: [
        {
          providerId: 'snomed-ct',
          searchTerm: 'Tumor staging',
          resultLabel: 'Tumor staging (tumor staging)'
        },
        {
          providerId: 'loinc',
          searchTerm: 'Stage group',
          resultLabel: 'Stage group.clinical Cancer'
        }
      ]
    });

    await addAnnotationToElement(context, 'Gateway_Split', {
      text: 'Treatment decision based on TNM stage: Stage I-II (operable) vs. Stage III-IV (inoperable)',
      codings: []
    });

    await setClinicalDomain(context, 'Task_Surgery', 'therapy');
    await addAnnotationToElement(context, 'Task_Surgery', {
      mode: 'prescriptive',
      text: 'Lobectomy or pneumonectomy for operable lung cancer Stage I-II',
      codings: [
        {
          providerId: 'snomed-ct',
          searchTerm: 'Partial lobectomy',
          resultLabel: 'Partial lobectomy of lung (procedure)'
        },
        {
          providerId: 'ops',
          searchTerm: 'lobectomy',
          resultLabel: 'Simple lobectomy and bilobectomy of the lung'
        }
      ]
    });

    await setClinicalDomain(context, 'Task_Chemo', 'therapy');
    await addAnnotationToElement(context, 'Task_Chemo', {
      mode: 'prescriptive',
      text: 'Cisplatin-based doublet chemotherapy for inoperable lung cancer Stage III-IV',
      codings: [
        {
          providerId: 'snomed-ct',
          searchTerm: 'Chemotherapy',
          resultLabel: 'Chemotherapy (procedure)'
        },
        {
          providerId: 'atc',
          searchTerm: 'Cisplatin',
          resultLabel: 'Cisplatin'
        }
      ]
    });

    await setClinicalDomain(context, 'DataObj_DischargeLetter', 'documentation');
    await addAnnotationToElement(context, 'DataObj_DischargeLetter', {
      aspect: 'documentType',
      mode: 'prescriptive',
      text: 'Medical discharge report upon completion of follow-up',
      codings: [
        {
          providerId: 'loinc',
          searchTerm: 'Discharge',
          resultLabel: 'Discharge summary'
        },
        {
          providerId: 'kdl',
          searchTerm: 'Medical discharge',
          resultLabel: 'Medical discharge report'
        }
      ]
    });
    await addAnnotationToElement(context, 'DataObj_DischargeLetter', {
      aspect: 'documentClass',
      mode: 'prescriptive',
      codings: [
        {
          providerId: 'ihe-xds-class',
          searchTerm: 'Physician',
          resultLabel: 'Physician letters'
        }
      ]
    });

    await setClinicalDomain(context, 'Task_Followup', 'follow-up');
    await addAnnotationToElement(context, 'Task_Followup', {
      text: 'Structured follow-up assessment with imaging surveillance and lab monitoring',
      codings: [
        {
          providerId: 'snomed-ct',
          searchTerm: 'Follow-up encounter',
          resultLabel: 'Follow-up encounter (procedure)'
        },
        {
          providerId: 'loinc',
          searchTerm: 'Plan of care',
          resultLabel: 'Plan of care note'
        }
      ]
    });

    const xml = await serializeXml(context.moddle, context.definitions);
    maybePrintXml('Reference_Cross_Section', xml);

    expect(xml).toContain('id="Gateway_Split"');
    expect(xml).toContain('Treatment decision based on TNM stage: Stage I-II (operable) vs. Stage III-IV (inoperable)');
    expect(xml).toContain('id="Task_Surgery"');
    expect(xml).toContain('<term:coding system="http://fhir.de/CodeSystem/bfarm/ops" code="5-324" display="Simple lobectomy and bilobectomy of the lung"');
    expect(xml).toContain('id="Task_Followup"');
    expect(xml).toContain('<term:coding system="http://loinc.org" code="18776-5" display="Plan of care note"');
    expect(xml).not.toContain('fhirmap:');
  });
});

async function createTestContext({ id, type, name }) {
  const context = await createProcessContext([
    { id, type, name }
  ]);

  return {
    ...context,
    element: context.elements[id]
  };
}

async function createProcessContext(elementDefinitions) {
  const { default: descriptor } = await import('../../src/moddle/clinical.json');
  const moddle = new BpmnModdle({ term: descriptor });
  const process = moddle.create('bpmn:Process', {
    id: 'Process_1',
    isExecutable: false,
    flowElements: []
  });
  const definitions = moddle.create('bpmn:Definitions', {
    id: 'Definitions_1',
    targetNamespace: 'https://example.invalid/bpmn',
    rootElements: [ process ]
  });

  process.$parent = definitions;
  const elements = {};

  for (const definition of elementDefinitions) {
    let businessObject;

    if (definition.type === 'bpmn:DataObjectReference') {
      const dataObject = moddle.create('bpmn:DataObject', {
        id: `${definition.id}_Source`
      });

      businessObject = moddle.create(definition.type, {
        id: definition.id,
        name: definition.name,
        dataObjectRef: dataObject
      });

      dataObject.$parent = process;
      businessObject.$parent = process;
      process.flowElements.push(dataObject, businessObject);
    } else {
      businessObject = moddle.create(definition.type, {
        id: definition.id,
        name: definition.name
      });
      businessObject.$parent = process;
      process.flowElements.push(businessObject);
    }

    elements[definition.id] = { businessObject };
  }

  const modeling = {
    updateModdleProperties: vi.fn((element, bo, properties) => {
      Object.entries(properties).forEach(([key, value]) => {
        bo.set(key, value);
      });
    })
  };

  return {
    definitions,
    elements,
    modeling,
    moddle
  };
}

function setServices(context) {
  serviceState.current = {
    moddle: context.moddle,
    modeling: context.modeling,
    translate: (value) => value,
    terminologyRegistry: {
      listProviders: () => PROVIDERS,
      search: vi.fn(async (term, providerId) => ({
        items: SEARCH_RESULTS[providerId].filter((concept) =>
          concept.display.toLowerCase().includes(term.toLowerCase())
        )
      }))
    }
  };
}

async function createAnnotation(container, config) {
  fireEvent.click(screen.getByText('+ Add annotation'));

  if (config.aspect) {
    fireEvent.change(getControlByLabel(container, 'Aspect'), {
      target: { value: config.aspect }
    });
  }

  if (config.mode) {
    fireEvent.change(getControlByLabel(container, 'Mode'), {
      target: { value: config.mode }
    });
  }

  if (config.text) {
    fireEvent.input(getControlByLabel(container, 'Free text'), {
      target: { value: config.text }
    });
  }

  for (let index = 0; index < config.codings.length; index++) {
    const coding = config.codings[index];

    fireEvent.change(getControlByLabel(container, 'Terminology'), {
      target: { value: coding.providerId }
    });

    const searchInput = getControlByLabel(container, 'Search');

    fireEvent.focus(searchInput);
    fireEvent.input(searchInput, {
      target: { value: coding.searchTerm }
    });

    const suggestion = await waitFor(() => {
      const match = Array.from(container.querySelectorAll('.search-suggestion'))
        .find((node) => node.querySelector('.search-suggestion__label')?.textContent === coding.resultLabel);

      expect(match).toBeTruthy();
      return match;
    });

    fireEvent.mouseDown(suggestion);

    await waitFor(() => {
      expect(container.querySelectorAll('.selected-coding')).toHaveLength(index + 1);
    });
  }

  if (config.codings.length > 0) {
    const finalSearchInput = getControlByLabel(container, 'Search');

    fireEvent.keyDown(finalSearchInput, {
      key: 'Tab'
    });
  } else {
    fireEvent.keyDown(getControlByLabel(container, 'Terminology'), {
      key: 'Tab'
    });
  }

  await waitFor(() => {
    expect(screen.queryByText('+ Add annotation')).toBeTruthy();
  });
}

async function setClinicalDomain(context, elementId, value) {
  const view = render(h(ClinicalDomainEntry, { element: context.elements[elementId] }));
  fireEvent.change(screen.getByLabelText('Clinical domain'), {
    target: { value }
  });
  view.unmount();
}

async function addAnnotationToElement(context, elementId, config) {
  const view = render(h(AnnotationListEntry, { element: context.elements[elementId] }));
  await createAnnotation(view.container, config);
  view.unmount();
}

function getControlByLabel(container, labelText) {
  const label = Array.from(container.querySelectorAll('label'))
    .find((node) => node.textContent.trim().startsWith(labelText));

  if (!label) {
    throw new Error(`Could not find label: ${labelText}`);
  }

  const row = label.closest('.form-row') || label.parentElement;
  const control = row.querySelector('select, textarea, input');

  if (!control) {
    throw new Error(`Could not find control for label: ${labelText}`);
  }

  return control;
}

async function serializeXml(moddle, definitions) {
  const { xml } = await moddle.toXML(definitions, { format: true });
  return xml;
}

function maybePrintXml(label, xml) {
  if (!process.env.PRINT_TERMINOLOGY_UI_XML) {
    return;
  }

  console.log(`\n----- ${label} -----\n${xml}\n`);
}
