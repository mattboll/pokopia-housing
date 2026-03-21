/**
 * Parses CSV text into an array of objects.
 * First line is treated as headers.
 *
 * @param {string} csvText - Raw CSV string
 * @returns {Object[]} Array of objects keyed by header names
 */
export function parseCSV(csvText) {
  const lines = csvText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return [];
  }

  const headers = lines[0].split(',').map((h) => h.trim());

  return lines.slice(1).map((line) => {
    const values = line.split(',');
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = (values[i] ?? '').trim();
    });
    return obj;
  });
}
