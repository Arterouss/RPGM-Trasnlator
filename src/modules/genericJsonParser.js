/**
 * Generic JSON Localization Parser & Reconstructor
 * Handles general indie games (Godot, Construct, Phaser, Defold) with JSON localizations.
 */

export function extractStringsFromGenericJson(filename, jsonData) {
  const extracted = [];
  const baseName = filename.split('/').pop();

  function walk(obj, path = []) {
    if (typeof obj === 'string') {
      const trimmed = obj.trim();
      // Skip numbers, colors, boolean-like strings, or asset paths (like 'images/bg.png')
      if (
        trimmed.length > 0 &&
        !/^#[0-9a-fA-F]{3,8}$/.test(trimmed) &&
        !/^[a-zA-Z0-9_\-./]+\.(png|jpg|ogg|mp3|wav|json)$/i.test(trimmed)
      ) {
        extracted.push({
          id: `${baseName}#${path.join('.')}`,
          file: baseName,
          path,
          originalText: obj,
          maskedText: obj,
          tags: [],
          translatedText: '',
          type: 'Generic Text',
        });
      }
      return;
    }

    if (Array.isArray(obj)) {
      obj.forEach((item, idx) => walk(item, [...path, idx]));
    } else if (obj !== null && typeof obj === 'object') {
      Object.keys(obj).forEach((key) => walk(obj[key], [...path, key]));
    }
  }

  walk(jsonData);
  return extracted;
}

export function injectTranslatedStringsGenericJson(jsonData, stringEntries) {
  const cloned = JSON.parse(JSON.stringify(jsonData));

  stringEntries.forEach((entry) => {
    if (!entry.translatedText || !entry.path) return;
    let curr = cloned;
    for (let i = 0; i < entry.path.length - 1; i++) {
      const seg = entry.path[i];
      if (curr[seg] === undefined || curr[seg] === null) return;
      curr = curr[seg];
    }
    const lastKey = entry.path[entry.path.length - 1];
    if (curr && lastKey !== undefined) {
      curr[lastKey] = entry.translatedText;
    }
  });

  return cloned;
}
