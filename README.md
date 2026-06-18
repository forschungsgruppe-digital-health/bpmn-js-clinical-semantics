# bpmn-js-clinical-semantics

[![CI](https://github.com/forschungsgruppe-digital-health/bpmn-js-clinical-semantics/actions/workflows/ci.yml/badge.svg)](https://github.com/forschungsgruppe-digital-health/bpmn-js-clinical-semantics/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A518-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
![Status](https://img.shields.io/badge/status-under%20development-orange.svg)

**Semantic clinical annotations and FHIR resource mapping for BPMN process models.**

> ⚠️ **Status: under active development — not for production use.**
> This is a **research prototype** developed in the MiHUB project (TU Dresden / Forschungsgruppe
> Digital Health). The public API, the moddle schema, and the published packages may change without
> notice, and the libraries have not been production-hardened or independently security-reviewed.
> **Do not use it to process real patient data — only synthetic test data.**

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

For the full background and design rationale, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## Features

### Terminology Annotations (`@forschungsgruppe-digital-health/terminology`)

- [x] Multi-code annotation of any BPMN element (Tasks, DataObjects, Events, Gateways, MessageFlows)
- [x] Pluggable provider architecture with built-in support for SNOMED CT (via Snowstorm), any FHIR-hosted code system (LOINC, ICD-10-GM, OPS, ATC, ICD-O-3), IHE XDS classCode/typeCode, and KDL
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

### FHIR Resource Mapping (`@forschungsgruppe-digital-health/fhir-mapping`)

- [x] Resource-level FHIR mapping (resourceType, profile URL, interaction, direction)
- [x] Key element binding with FHIRPath expressions, semantic roles, fixed values, and terminology bindings
- [x] Search parameter declaration for FHIR search-type interactions
- [x] JSON export of all FHIR mappings from a BPMN model
- [x] Independent from the terminology package -- usable separately or together
- [ ] FHIR Bundle generation from annotated process models
- [ ] StructureMap generation and validation
- [ ] FHIR R5 SubscriptionTopic support
- [ ] Automated conformance checking against FHIR profiles

### Vue Integration (`packages/demo` — private demo, not published)

- [x] `useTerminology()` and `useFhirMapping()` composables for Vue 3
- [ ] Additional framework integrations (React, Angular)

### Tooling and Quality

- [x] Unit-test suite covering core modules, adapters, providers, helpers, and public API
- [x] CI pipeline on Node 18 and 20
- [x] GitHub Pages deployment of interactive demo
- [ ] TypeScript type definitions (.d.ts)
- [ ] End-to-end tests with bpmn-js integration
- [x] Automated release pipeline with changelog generation (release-please)

> MVP scope and acceptance criteria for the terminology and FHIR-mapping features live in the
> user stories under [`docs/user-stories/`](docs/user-stories/).

---

## Packages

| Package | Description | Install |
|---|---|---|
| [`@forschungsgruppe-digital-health/terminology`](packages/terminology/) | Terminology annotation engine, providers, moddle extension, properties panel | `npm i @forschungsgruppe-digital-health/terminology` |
| [`@forschungsgruppe-digital-health/fhir-mapping`](packages/fhir-mapping/) | FHIR resource mapping, moddle extension, properties panel | `npm i @forschungsgruppe-digital-health/fhir-mapping` |

Either package can be installed independently. A Vue 3 integration is provided in the **private, unpublished** [`packages/demo`](packages/demo/) package (`@forschungsgruppe-digital-health/demo`) — an example, not installed from the registry.

Packages are published to the [GitHub Package Registry](https://docs.github.com/en/packages). See [CONTRIBUTING.md](CONTRIBUTING.md#configuring-npm-for-the-github-registry) for registry configuration.

---

## Quick Start

### Prerequisites

- Node.js >= 18
- An existing project using [bpmn-js](https://github.com/bpmn-io/bpmn-js) >= 15 and [bpmn-js-properties-panel](https://github.com/bpmn-io/bpmn-js-properties-panel) >= 5

### Install

```bash
npm install @forschungsgruppe-digital-health/terminology @forschungsgruppe-digital-health/fhir-mapping
```

> ⚠️ These packages are published to **GitHub Packages**, not the public npm registry — configure the
> `@forschungsgruppe-digital-health` scope first (see
> [CONTRIBUTING.md](CONTRIBUTING.md#configuring-npm-for-the-github-registry)). They are pre-1.0 and no
> release has been cut yet (see the status banner above), so a bare `npm install` will not resolve them
> until the first release is published.

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
} from '@forschungsgruppe-digital-health/terminology';

import {
  FhirMappingModdleDescriptor,
  FhirMappingPropertiesPanelModule
} from '@forschungsgruppe-digital-health/fhir-mapping';

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
  TerminologyRegistry,
  SnomedCtProvider,
  createKdlProvider,
  addAnnotation,
  ASPECTS
} from '@forschungsgruppe-digital-health/terminology';

// Set up providers
const registry = new TerminologyRegistry();
registry.register(new SnomedCtProvider({ baseUrl: 'https://snowstorm.example.com' }));
registry.register(createKdlProvider());

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

For adding custom terminology systems (FHIR-hosted, static, or custom API), see [docs/arc42/08 — Extending with a New Terminology System](docs/arc42/08_crosscutting_concepts.md#extending-with-a-new-terminology-system).

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
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Contributors, integrators | Design decisions, UML diagrams, data model, project structure, extensibility |
| [docs/EXTENDING.md](docs/EXTENDING.md) | New contributors, extension developers | Primer: BPMN & BPMN XML, the standard extension mechanism, the bpmn.io toolkit, the five ways to extend bpmn.io, and how this repo maps onto them — with links to the OMG and bpmn.io sources |
| [docs/concepts/synthea-gmf-module-mapping.md](docs/concepts/synthea-gmf-module-mapping.md) | Contributors, researchers | Concept/proposal: a bpmn.io properties-panel extension that maps BPMN patient pathways onto the Synthea Generic Module Framework to generate Synthea modules (not yet implemented) |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Contributors | Development setup, coding standards, testing, branching, release process |
| [AGENTS.md](AGENTS.md) | AI coding agents (all tools) | Single-source operational context: the quality gate, conventions, hard rules; CLAUDE.md imports it |
| [CHANGELOG.md](CHANGELOG.md) | All users, maintainers | Repository-level changelog (Keep a Changelog); per-package version history is generated by release-please |
| [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) | All participants | Community standards (Contributor Covenant 2.1) and how to report concerns |

---

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for the full contributor guide covering development setup, coding standards, testing, branching strategy, and the release and publishing process. By participating you agree to our [Code of Conduct](CODE_OF_CONDUCT.md) (Contributor Covenant 2.1); notable changes are recorded in the [CHANGELOG](CHANGELOG.md).

```bash
git clone https://github.com/forschungsgruppe-digital-health/bpmn-js-clinical-semantics.git
cd bpmn-js-clinical-semantics
npm install --legacy-peer-deps
npm test        # run the test suite
npm run dev     # interactive demo at http://localhost:5173
```

---

## License

[Apache License 2.0](LICENSE)

Apache 2.0 was chosen for compatibility with the FHIR ecosystem (HAPI FHIR, Snowstorm, Blaze, Medplum all use Apache 2.0) and bpmn-js (MIT, compatible with Apache 2.0). Apache 2.0 provides an explicit patent grant, which is relevant for medical informatics tooling.

**Important:** This project contains **software** under Apache 2.0. The medical terminology systems it integrates with (SNOMED CT, LOINC, ICD-10-GM, KDL etc.) have their own licensing terms that apply independently. Users must obtain appropriate licenses for the terminology content they use.
