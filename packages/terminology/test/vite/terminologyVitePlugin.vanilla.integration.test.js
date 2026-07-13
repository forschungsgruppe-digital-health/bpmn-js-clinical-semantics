import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { terminologyVitePlugin } from '../../src/vite/plugin.js';

describe('terminologyVitePlugin (vanilla integration)', () => {
  it('discovers hl7.terminology.r4 for the vanilla example', () => {
    const vanillaRoot = resolve(process.cwd(), '../../examples/vanilla');
    const plugin = terminologyVitePlugin();

    plugin.configResolved({
      root: vanillaRoot
    });

    const resolvedId = plugin.resolveId('virtual:fdh-terminology-packages');
    const code = plugin.load(resolvedId);

    expect(code).toContain('"hl7.terminology.r4": [');
  });

  it('loads another real terminology package via explicit plugin packages', () => {
    const vanillaRoot = resolve(process.cwd(), '../../examples/vanilla');
    const plugin = terminologyVitePlugin({
      packages: ['de.ihe-d.terminology']
    });

    plugin.configResolved({
      root: vanillaRoot
    });

    const resolvedId = plugin.resolveId('virtual:fdh-terminology-packages');
    const code = plugin.load(resolvedId);

    expect(code).toContain('"de.ihe-d.terminology": [');
    expect(code).toContain('CodeSystem-IHEXDSclassCode.json');
  });
});
