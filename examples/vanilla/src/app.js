import BpmnModeler from 'bpmn-js/lib/Modeler';
import {
  BpmnPropertiesPanelModule,
  BpmnPropertiesProviderModule
} from 'bpmn-js-properties-panel';

// ─── Import from @forschungsgruppe-digital-health/terminology ──────────────────
import {
  TerminologyModdleDescriptor,
  TerminologyPropertiesPanelModule
} from '@forschungsgruppe-digital-health/terminology';

// ─── Import from @forschungsgruppe-digital-health/fhir-mapping ────────────────
import {
  FhirMappingModdleDescriptor,
  FhirMappingPropertiesPanelModule
} from '@forschungsgruppe-digital-health/fhir-mapping';

// ─── CSS ─────────────────────────────────────────────────────
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';
import '@bpmn-io/properties-panel/dist/assets/properties-panel.css';

// ─── Create modeler with BOTH extensions ─────────────────────

const modeler = new BpmnModeler({
  container: '#canvas',
  propertiesPanel: {
    parent: '#properties'
  },
  additionalModules: [
    BpmnPropertiesPanelModule,
    BpmnPropertiesProviderModule,
    TerminologyPropertiesPanelModule,    // ← Terminology annotations group
    FhirMappingPropertiesPanelModule     // ← FHIR mapping group
  ],
  moddleExtensions: {
    term: TerminologyModdleDescriptor,   // ← term: namespace
    fhirmap: FhirMappingModdleDescriptor // ← fhirmap: namespace
  }
});

// ─── Load sample diagram ─────────────────────────────────────

async function loadDiagram() {
  try {
    const response = await fetch('./sample.bpmn');
    const xml = await response.text();
    await modeler.importXML(xml);
    modeler.get('canvas').zoom('fit-viewport');
  } catch (err) {
    console.error('Failed to load diagram', err);
  }
}

loadDiagram();

// ─── XML Download ────────────────────────────────────────────

document.getElementById('btn-download').addEventListener('click', async () => {
  const { xml } = await modeler.saveXML({ format: true });
  const blob = new Blob([xml], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'clinical-annotated.bpmn';
  a.click();
  URL.revokeObjectURL(url);
});

// ─── XML Viewer Toggle ──────────────────────────────────────

const xmlOverlay = document.getElementById('xml-overlay');
const xmlContent = document.getElementById('xml-content');

document.getElementById('btn-xml-toggle').addEventListener('click', async () => {
  const { xml } = await modeler.saveXML({ format: true });
  xmlContent.textContent = xml;
  xmlOverlay.classList.remove('xml-overlay--hidden');
});

document.getElementById('btn-xml-close').addEventListener('click', () => {
  xmlOverlay.classList.add('xml-overlay--hidden');
});
