# bpmn-js-clinical-semantics

[![CI](https://github.com/forschungsgruppe-digital-health/bpmn-js-clinical-semantics/actions/workflows/ci.yml/badge.svg)](https://github.com/forschungsgruppe-digital-health/bpmn-js-clinical-semantics/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A518-339933?logo=node.js&logoColor=white)](https://nodejs.org/)

**Semantic clinical annotations and FHIR resource mapping for BPMN process models.**

Two independent [bpmn-js](https://github.com/bpmn-io/bpmn-js) extension libraries that add clinical context to BPMN diagrams without modifying the BPMN standard. Each library provides a moddle extension (for XML serialization) and a properties panel provider (for interactive editing). Both annotation layers are stored as standard BPMN 2.0 `extensionElements`, preserving full backwards compatibility with every BPMN engine and viewer.

> **Live Demo:** [forschungsgruppe-digital-health.github.io/bpmn-js-clinical-semantics](https://forschungsgruppe-digital-health.github.io/bpmn-js-clinical-semantics/)

---

## Table of Contents

- [Motivation](#motivation)
- [Features](#features)
- [Packages](#packages)
- [Quick Start](#quick-start)
- [Programmatic Usage](#programmatic-usage)
- [Generated XML](#generated-xml)
- [Demo and GitHub Pages](#demo-and-github-pages)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)

---

## Motivation

BPMN 2.0 is widely used for modelling clinical pathways, but its elements carry no machine-readable clinical semantics. A task labelled "CT-Thorax" has no link to a SNOMED CT procedure code, no classification as an IHE XDS document type, and no mapping to a FHIR resource. This makes BPMN diagrams unreliable for clinical process automation, cross-institutional pathway exchange, and FHIR-based interoperability.

**bpmn-js-clinical-semantics** closes this gap by adding two optional annotation layers: terminology annotations (`term:` namespace) for codes from SNOMED CT, LOINC, ICD-10-GM, OPS, IHE XDS, KDL, and other systems; and FHIR resource mappings (`fhirmap:` namespace) for declaring resource types, profiles, interactions, and key elements. Both layers use standard BPMN `extensionElements`, so non-clinical tools simply ignore them.

For the full background and design rationale, see [ARCHITECTURE.md](ARCHITECTURE.md).

---

## Features

### Terminology Annotations (`@bpmn-js-clinical-semantics/terminology`)

- [x] Multi-code annotation of any BPMN element (Tasks, DataObjects, Events, Gateways, MessageFlows)
- [x] Pluggable provider architecture with built-in support for SNOMED CT (via Snowstorm), any FHIR-hosted code system (LOINC, ICD-10-GM, OPS, ATC, ICD-O-3), package-backed HL7 terminology resources, IHE XDS classCode/typeCode, and KDL
- [x] Aspect-based annotation model (clinicalContent, documentClass, documentType, note, confidentiality, status, format, participant)
- [x] Descriptive and prescriptive modes with optional FHIRPath mapping targets
- [x] Extensibility without code changes -- new terminology systems via `TerminologyProvider` interface
- [x] Offline-capable static providers for small code systems (IHE XDS, KDL)
- [x] Interactive properties panel integration for the bpmn-js modeler
- [x] TerminologyRegistry facade with search, searchAll, lookup, and validate
- [ ] Terminology validation at design time (real-time code verification against server)
- [ ] Auto-complete / type-ahead search in properties panel
- [ ] Import terminology bindings from existing FHIR profiles
- [ ] Bulk export of annotations as FHIR CodeSystem/ValueSet resources

### FHIR Resource Mapping (`@bpmn-js-clinical-semantics/fhir-mapping`)

- [x] Resource-level FHIR mapping (resourceType, profile URL, interaction, direction)
- [x] Key element binding with FHIRPath expressions, semantic roles, fixed values, and terminology bindings
- [x] Search parameter declaration for FHIR search-type interactions
- [x] JSON export of all FHIR mappings from a BPMN model
- [x] Independent from the terminology package -- usable separately or together
- [ ] FHIR Bundle generation from annotated process models
- [ ] StructureMap generation and validation
- [ ] FHIR R5 SubscriptionTopic support
- [ ] Automated conformance checking against FHIR profiles

### Vue Integration (`@bpmn-js-clinical-semantics/vue`)

- [x] `useTerminology()` and `useFhirMapping()` composables for Vue 3
- [ ] Additional framework integrations (React, Angular)

### Tooling and Quality

- [x] 173 unit tests covering core modules, adapters, providers, helpers, and public API
- [x] CI pipeline on Node 18 and 20
- [x] GitHub Pages deployment of interactive demo
- [ ] TypeScript type definitions (.d.ts)
- [ ] End-to-end tests with bpmn-js integration
- [ ] Automated release pipeline with changelog generation

---

## Packages

| Package | Description | Install |
|---|---|---|
| [`@bpmn-js-clinical-semantics/terminology`](packages/terminology/) | Terminology annotation engine, providers, moddle extension, properties panel | `npm i @bpmn-js-clinical-semantics/terminology` |
| [`@bpmn-js-clinical-semantics/fhir-mapping`](packages/fhir-mapping/) | FHIR resource mapping, moddle extension, properties panel | `npm i @bpmn-js-clinical-semantics/fhir-mapping` |
| [`@bpmn-js-clinical-semantics/vue`](packages/vue/) | Vue 3 composables (`useTerminology`, `useFhirMapping`) | `npm i @bpmn-js-clinical-semantics/vue` |

Either package can be installed independently. The Vue package is optional and only needed for Vue 3 projects.

Packages are published to the [GitHub Package Registry](https://docs.github.com/en/packages). See [CONTRIBUTING.md](CONTRIBUTING.md#configuring-npm-for-the-github-registry) for registry configuration.

---

## Quick Start

### Prerequisites

- Node.js >= 18
- An existing project using [bpmn-js](https://github.com/bpmn-io/bpmn-js) >= 15 and [bpmn-js-properties-panel](https://github.com/bpmn-io/bpmn-js-properties-panel) >= 5

### Install

```bash
npm install @bpmn-js-clinical-semantics/terminology @bpmn-js-clinical-semantics/fhir-mapping
```

### Integrate into your bpmn-js modeler

```js
import BpmnModeler from 'bpmn-js/lib/Modeler';
import {
  BpmnPropertiesPanelModule,
  BpmnPropertiesProviderModule
} from 'bpmn-js-properties-panel';

import {
  TerminologyModdleDescriptor,
  TerminologyPropertiesPanelModule
} from '@bpmn-js-clinical-semantics/terminology';

import {
  FhirMappingModdleDescriptor,
  FhirMappingPropertiesPanelModule
} from '@bpmn-js-clinical-semantics/fhir-mapping';

const modeler = new BpmnModeler({
  container: '#canvas',
  propertiesPanel: { parent: '#properties' },
  additionalModules: [
    BpmnPropertiesPanelModule,
    BpmnPropertiesProviderModule,
    TerminologyPropertiesPanelModule,     // adds "Klinische Annotation" group
    FhirMappingPropertiesPanelModule      // adds "FHIR Resource Mapping" group
  ],
  moddleExtensions: {
    term: TerminologyModdleDescriptor,    // term: namespace in XML
    fhirmap: FhirMappingModdleDescriptor  // fhirmap: namespace in XML
  }
});
```

---

## Programmatic Usage

```js
import {
  FhirProvider,
  FallbackProvider,
  TerminologyRegistry,
  SnomedCtProvider,
  createKdlProvider,
  createStaticProviderFromCodeSystem,
  createFhirTerminologyProviderLoader,
  addAnnotation,
  ASPECTS
} from '@bpmn-js-clinical-semantics/terminology';
import actCodeCodeSystem from './path/to/CodeSystem-v3-ActCode.json';

// Set up providers
const registry = new TerminologyRegistry();
registry.register(new SnomedCtProvider({ baseUrl: 'https://snowstorm.example.com' }));
registry.register(createKdlProvider());
registry.register(new FallbackProvider({
  id: 'hl7-v3-actcode',
  displayName: 'HL7 v3 ActCode',
  primaryProvider: createStaticProviderFromCodeSystem(actCodeCodeSystem, {
    id: 'hl7-v3-actcode-package'
  }),
  fallbackProvider: new FhirProvider({
    id: 'hl7-v3-actcode-fhir',
    displayName: 'HL7 v3 ActCode (FHIR)',
    systemUri: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
    valueSetUri: 'http://terminology.hl7.org/ValueSet/v3-ActCode',
    baseUrl: 'https://fhir.example.com'
  })
}));

const terminologyProviderLoader = createFhirTerminologyProviderLoader({
  terminologyRegistry: registry,
  fhirBaseUrl: 'https://fhir.example.com'
});

await terminologyProviderLoader.ensureProvider('http://terminology.hl7.org/CodeSystem/v3-ActCode');

// Search across all providers
const results = await registry.searchAll('pneumonia');

// Add an annotation to a BPMN element's businessObject
addAnnotation(businessObject, moddle, {
  aspect: ASPECTS.CLINICAL_CONTENT,
  mode: 'descriptive',
  text: 'CT-Thorax mit Kontrastmittel',
  codings: [{ system: 'http://snomed.info/sct', code: '169069000', display: 'CT of chest' }]
});
```

`createStaticProviderFromCodeSystem()` turns a FHIR `CodeSystem` JSON resource into an in-memory `StaticProvider`. This makes local FHIR packages such as `hl7.terminology.r4` useful without writing a custom adapter: import the package JSON, build a local provider, and optionally wrap it in `FallbackProvider` so a FHIR terminology server remains available when the local package snapshot is missing a concept or unavailable in a given deployment. The demo follows that pattern for HL7 v2/v3 terminology and vendors selected `CodeSystem` resources from `hl7.terminology.r4@7.0.1` under `examples/vanilla/src/vendor/hl7-terminology-r4/`, because the upstream npm package currently depends on `hl7.fhir.r4.core@4.0.1`, which is not resolvable in this workspace install.

For adding custom terminology systems (FHIR-hosted, static, package-backed, or custom API), see [ARCHITECTURE.md -- Extending with a New Terminology System](ARCHITECTURE.md#extending-with-a-new-terminology-system). The demo keeps its concrete server URLs and package imports in a dedicated bootstrap/config layer; the properties panel only talks to `terminologyRegistry` and an optional `terminologyProviderLoader`. For FHIR terminology servers that need explicit canonical ValueSet URLs or version hints, `FhirProvider` also supports `valueSetUri` and `expandParameters`.

---

## Generated XML

Annotations and mappings are persisted as standard BPMN 2.0 extension elements:

```xml
<bpmn2:dataObject id="DataObj_Befund" name="CT-Befundbericht"
                  xmlns:term="https://clinical-bpmn.org/terminology/v1"
                  xmlns:fhirmap="https://clinical-bpmn.org/fhir-mapping/v1"
                  term:clinicalDomain="diagnostics">
  <bpmn2:extensionElements>
    <term:annotations>
      <term:annotation aspect="clinicalContent" mode="descriptive"
                       text="CT-Befund Thorax mit KM">
        <term:coding system="http://snomed.info/sct"
                     code="169069000" display="CT of chest (procedure)"/>
      </term:annotation>
    </term:annotations>
    <fhirmap:resourceMappings>
      <fhirmap:resourceMapping resourceType="DiagnosticReport"
                               interaction="create" direction="output">
        <fhirmap:keyElement path="DiagnosticReport.status"
                           semanticRole="trigger" fixedValue="final"/>
      </fhirmap:resourceMapping>
    </fhirmap:resourceMappings>
  </bpmn2:extensionElements>
</bpmn2:dataObject>
```

The two namespaces (`term:` and `fhirmap:`) are independent. Non-clinical BPMN tools ignore them and preserve them on re-save.

---

## Demo and GitHub Pages

The interactive demo is automatically deployed to GitHub Pages on every push to `main`.

**Live Demo:** [forschungsgruppe-digital-health.github.io/bpmn-js-clinical-semantics](https://forschungsgruppe-digital-health.github.io/bpmn-js-clinical-semantics/)

The demo shows the full bpmn-js modeler with both annotation panels active, loaded with a sample lung cancer diagnostic pathway. Click any BPMN element to inspect and edit its annotations, view the resulting XML, and download the annotated BPMN file.
To run the demo locally:

```bash
git clone https://github.com/forschungsgruppe-digital-health/bpmn-js-clinical-semantics.git
cd bpmn-js-clinical-semantics
npm install --legacy-peer-deps
npm run dev
```

---

## Documentation

| Document | Audience | Content |
|---|---|---|
| [README.md](README.md) | All users | Overview, features, quick start, usage examples |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Contributors, integrators | Design decisions, UML diagrams, data model, project structure, extensibility |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Contributors | Development setup, coding standards, testing, branching, release process |

---

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for the full contributor guide covering development setup, coding standards, testing, branching strategy, and the release and publishing process.

```bash
git clone https://github.com/forschungsgruppe-digital-health/bpmn-js-clinical-semantics.git
cd bpmn-js-clinical-semantics
npm install --legacy-peer-deps
npm test        # 173 tests
npm run dev     # interactive demo at http://localhost:5173
```

---

## License

[Apache License 2.0](LICENSE)

Apache 2.0 was chosen for compatibility with the FHIR ecosystem (HAPI FHIR, Snowstorm, Blaze, Medplum all use Apache 2.0) and bpmn-js (MIT, compatible with Apache 2.0). Apache 2.0 provides an explicit patent grant, which is relevant for medical informatics tooling.

**Important:** This project contains **software** under Apache 2.0. The medical terminology systems it integrates with (SNOMED CT, LOINC, ICD-10-GM, KDL etc.) have their own licensing terms that apply independently. Users must obtain appropriate licenses for the terminology content they use.
