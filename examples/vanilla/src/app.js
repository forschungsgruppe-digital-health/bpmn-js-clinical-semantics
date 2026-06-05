import BpmnModeler from 'bpmn-js/lib/Modeler';
import {
  BpmnPropertiesPanelModule,
  BpmnPropertiesProviderModule
} from 'bpmn-js-properties-panel';

// ─── Import from @bpmn-js-clinical-semantics/terminology ──────────────────
import {
  TerminologyModdleDescriptor,
  createTerminologyPropertiesPanelModule
} from '@bpmn-js-clinical-semantics/terminology';
import {
  createDemoTerminologyServices,
  createDemoTerminologyModule
} from './terminology-config.js';
import { DEMO_FEATURES } from './demo-config.js';

// ─── Import from @bpmn-js-clinical-semantics/fhir-mapping ────────────────
import {
  FhirMappingModdleDescriptor,
  FhirMappingPropertiesPanelModule
} from '@bpmn-js-clinical-semantics/fhir-mapping';

// ─── CSS ─────────────────────────────────────────────────────
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';
import '@bpmn-io/properties-panel/dist/assets/properties-panel.css';
import './styles.css';

// ─── Create modeler with BOTH extensions ─────────────────────
const additionalModules = [];
const moddleExtensions = {};

if (DEMO_FEATURES.showPropertiesPanel) {
  additionalModules.push(
    BpmnPropertiesPanelModule,
    BpmnPropertiesProviderModule
  );
}

if (DEMO_FEATURES.showTerminology) {
  const terminologyServices = createDemoTerminologyServices();
  const terminologyServicesModule = createDemoTerminologyModule(terminologyServices);

  additionalModules.push(
    createTerminologyPropertiesPanelModule({
      showClinicalDomain: DEMO_FEATURES.showTerminologyClinicalDomain,
      showAnnotations: DEMO_FEATURES.showTerminologyAnnotations,
      showMappingTarget: DEMO_FEATURES.showTerminologyMappingTarget
    }),
    terminologyServicesModule
  );

  moddleExtensions.term = TerminologyModdleDescriptor;
}

if (DEMO_FEATURES.showFhirMapping) {
  additionalModules.push(FhirMappingPropertiesPanelModule);
  moddleExtensions.fhirmap = FhirMappingModdleDescriptor;
}

const modeler = new BpmnModeler({
  container: '#canvas',
  ...(DEMO_FEATURES.showPropertiesPanel
    ? {
        propertiesPanel: {
          parent: '#properties'
        }
      }
    : {}),
  additionalModules,
  moddleExtensions
});

// ─── Load sample diagram ─────────────────────────────────────

async function loadDiagram() {
  try {
    // Wir versuchen zuerst den relativen, dann den absoluten Pfad
    let response = await fetch('./sample.bpmn');
    if (response.headers.get('content-type')?.includes('text/html')) {
      response = await fetch('/sample.bpmn');
    }
    const xml = await response.text();
    await modeler.importXML(xml);
    modeler.get('canvas').zoom('fit-viewport');
  } catch (err) {
    console.error('Failed to load diagram', err);
  }
}

loadDiagram();

function setVisibility(selector, isVisible) {
  const node = document.querySelector(selector);

  if (!node) {
    return null;
  }

  node.hidden = !isVisible;

  return node;
}

const downloadButton = setVisibility('#btn-download', DEMO_FEATURES.showXmlDownload);
const xmlToggleButton = setVisibility('#btn-xml-toggle', DEMO_FEATURES.showXmlPreview);

setVisibility('#properties', DEMO_FEATURES.showPropertiesPanel);
setVisibility('.app-footer', DEMO_FEATURES.showFooter);

const headerActions = document.querySelector('.app-header__actions');

if (headerActions) {
  headerActions.hidden = !DEMO_FEATURES.showXmlDownload && !DEMO_FEATURES.showXmlPreview;
}

// ─── XML Download ────────────────────────────────────────────

if (downloadButton) {
  downloadButton.addEventListener('click', async () => {
    const { xml } = await modeler.saveXML({ format: true });
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'clinical-annotated.bpmn';
    a.click();
    URL.revokeObjectURL(url);
  });
}

// ─── XML Viewer Toggle ──────────────────────────────────────

const xmlOverlay = document.getElementById('xml-overlay');
const xmlContent = document.getElementById('xml-content');

if (xmlToggleButton) {
  xmlToggleButton.addEventListener('click', async () => {
    const { xml } = await modeler.saveXML({ format: true });
    xmlContent.textContent = xml;
    xmlOverlay.classList.remove('xml-overlay--hidden');
  });
}

document.getElementById('btn-xml-close').addEventListener('click', () => {
  xmlOverlay.classList.add('xml-overlay--hidden');
});
