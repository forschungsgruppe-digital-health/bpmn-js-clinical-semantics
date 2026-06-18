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

// ─── Example diagrams (single source: examples/minimal, bundled via Vite ?raw) ─
import annotatedBpmn from '../../minimal/lung-cancer-staging-annotated.bpmn?raw';
import plainBpmn from '../../minimal/lung-cancer-staging.bpmn?raw';

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

// ─── Example diagrams (the minimal example is the default) ───

const SAMPLES = {
  annotated: { label: 'Lung cancer — annotated (term: + fhirmap:)', xml: annotatedBpmn },
  plain: { label: 'Lung cancer — plain BPMN (no extensions)', xml: plainBpmn },
  demo: { label: 'Demo sample', url: './sample.bpmn' }
};

async function loadSample(key) {
  try {
    const sample = SAMPLES[key] || SAMPLES.annotated;
    const xml = sample.xml ?? (await (await fetch(sample.url)).text());
    await modeler.importXML(xml);
    modeler.get('canvas').zoom('fit-viewport');
  } catch (err) {
    console.error('Failed to load diagram', err);
  }
}

const sampleSelect = document.getElementById('sample-select');
if (sampleSelect) {
  for (const [key, sample] of Object.entries(SAMPLES)) {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = sample.label;
    sampleSelect.appendChild(option);
  }
  sampleSelect.value = 'annotated';
  sampleSelect.addEventListener('change', () => loadSample(sampleSelect.value));
}

loadSample('annotated');

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
