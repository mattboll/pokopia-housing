/**
 * Returns a debounced version of the given function.
 * The function will only be called after `delay` ms have elapsed
 * since the last invocation.
 *
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(fn, delay = 300) {
  let timerId = null;

  return function (...args) {
    if (timerId !== null) {
      clearTimeout(timerId);
    }
    timerId = setTimeout(() => {
      timerId = null;
      fn.apply(this, args);
    }, delay);
  };
}
