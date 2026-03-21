/**
 * Creates a simple pub/sub reactive store.
 *
 * @param {Object} initialState - The initial state object
 * @returns {{ getState: () => Object, setState: (partial: Object) => void, subscribe: (key: string, callback: Function) => Function }}
 */
export function createStore(initialState) {
  let state = { ...initialState };
  const listeners = new Map();

  return {
    /**
     * Returns a shallow copy of the current state.
     * @returns {Object}
     */
    getState() {
      return { ...state };
    },

    /**
     * Merges partial state into current state and notifies
     * subscribers for each changed key.
     *
     * @param {Object} partial - Key/value pairs to merge
     */
    setState(partial) {
      const prev = state;
      state = { ...state, ...partial };

      for (const key of Object.keys(partial)) {
        if (partial[key] !== prev[key]) {
          const callbacks = listeners.get(key);
          if (callbacks) {
            callbacks.forEach((cb) => cb(state[key], prev[key]));
          }
        }
      }
    },

    /**
     * Subscribe to changes on a specific state key.
     *
     * @param {string} key - State key to watch
     * @param {Function} callback - Called with (newValue, oldValue) when key changes
     * @returns {Function} Unsubscribe function
     */
    subscribe(key, callback) {
      if (!listeners.has(key)) {
        listeners.set(key, new Set());
      }
      listeners.get(key).add(callback);

      return () => {
        const callbacks = listeners.get(key);
        if (callbacks) {
          callbacks.delete(callback);
        }
      };
    },
  };
}

/**
 * Default application store with initial state.
 */
export const store = createStore({
  language: 'fr',
  theme: 'light',
  selectedPokemon: new Set(),
  allPokemon: [],
  results: null,
  currentPage: 'optimal',
});
