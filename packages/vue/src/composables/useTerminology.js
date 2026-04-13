import { ref, inject, onMounted } from 'vue';

/**
 * Vue composable for accessing the terminology registry.
 *
 * Usage:
 *   const { availableSystems, search, searchResults, isSearching } = useTerminology();
 *
 * Requires a TerminologyRegistry to be provided via Vue's provide/inject:
 *   app.provide('terminologyRegistry', registry);
 */
export function useTerminology() {
  const registry = inject('terminologyRegistry', null);
  const availableSystems = ref([]);
  const searchResults = ref([]);
  const isSearching = ref(false);
  const error = ref(null);

  onMounted(() => {
    if (registry) {
      availableSystems.value = registry.listProviders();
    }
  });

  async function search(term, systemId, options) {
    if (!registry) return;
    isSearching.value = true;
    error.value = null;
    try {
      const result = await registry.search(term, systemId, options);
      searchResults.value = result.concepts;
    } catch (err) {
      error.value = err.message;
      searchResults.value = [];
    } finally {
      isSearching.value = false;
    }
  }

  async function searchAll(term, options) {
    if (!registry) return new Map();
    isSearching.value = true;
    const results = await registry.searchAll(term, options);
    isSearching.value = false;
    return results;
  }

  async function lookup(code, systemId) {
    if (!registry) return null;
    return registry.lookup(code, systemId);
  }

  return { availableSystems, searchResults, isSearching, error, search, searchAll, lookup, registry };
}
