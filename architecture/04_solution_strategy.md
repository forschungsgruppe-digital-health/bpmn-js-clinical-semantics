# 4. Solution Strategy

_Summarizes fundamental design decisions and strategies that form the cornerstones of the system architecture and shape its evolution._

## Design Decisions

**Monorepo with npm workspaces.** The three packages share a development lifecycle and are versioned together, but they are published independently. A consumer that only needs terminology annotations does not pull in the FHIR mapping code, and vice versa. The Vue package is optional for projects that use a different frontend framework.

**Separate XML namespaces.** Terminology annotations use the `term:` prefix (URI `https://clinical-bpmn.org/terminology/v1`) and FHIR mappings use the `fhirmap:` prefix (URI `https://clinical-bpmn.org/fhir-mapping/v1`). This keeps the two concerns decoupled in the BPMN XML and allows each layer to evolve independently.

**BPMN 2.0 extensionElements as the persistence mechanism.** Rather than inventing a sidecar format, both annotation layers use standard BPMN `extensionElements`. This means the annotated XML is still valid BPMN 2.0, can be opened in any compliant tool, and the annotations survive round-trip editing in tools that do not understand them.

**Provider/Adapter pattern for terminology access.** The `TerminologyProvider` interface defines a uniform contract (search, lookup, validate, getHierarchy). Concrete providers (`SnomedCtProvider`, `FhirProvider`, `StaticProvider`) implement this interface and optionally delegate to protocol-specific adapters (`SnowstormAdapter`, `FhirTerminologyAdapter`). This two-layer design means a new terminology system can often be added by configuring an existing adapter rather than writing an entirely new provider.

**Registry as a facade.** The `TerminologyRegistry` aggregates all providers and exposes `search`, `searchAll`, `lookup`, and `validate` as a single entry point. The properties panel depends on this abstraction, not on individual providers (Dependency Inversion Principle).

---

[← Architecture index](../ARCHITECTURE.md)
