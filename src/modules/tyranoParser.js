/**
 * TyranoBuilder & KAG Scenario (.ks) Script Parser & Reconstructor
 * Handles Visual Novel games built with TyranoBuilder / KAG engine on Android/Web.
 */

// Regex for TyranoBuilder / KAG tags: [p], [l], [r], [cm], [font ...], [ruby ...], etc.
const TYRANO_TAG_REGEX = /(\[[a-zA-Z0-9_]+(?:\s+[^\]]+)?\])/g;

export function maskTyranoTags(text) {
  if (typeof text !== 'string') return { maskedText: '', tags: [] };
  const tags = [];
  const maskedText = text.replace(TYRANO_TAG_REGEX, (match) => {
    // Keep structural tags untouched via placeholders
    const placeholder = `[[TAG_${tags.length}]]`;
    tags.push(match);
    return placeholder;
  });
  return { maskedText, tags };
}

export function unmaskTyranoTags(text, tags) {
  if (typeof text !== 'string' || !tags || !tags.length) return text || '';
  let result = text;
  tags.forEach((tag, index) => {
    const tagPattern = new RegExp(`\\[\\[\\s*TAG[_-]${index}\\s*\\]\\]`, 'gi');
    result = result.replace(tagPattern, () => tag);
  });
  return result;
}

/**
 * Extracts translatable lines from a TyranoBuilder (.ks) script.
 */
export function extractStringsFromTyranoScript(filename, scriptContent) {
  const extracted = [];
  const baseName = filename.split('/').pop();
  const lines = scriptContent.split('\n');

  let currentSpeaker = '';

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith(';')) continue; // Skip comments

    // Speaker indicator: `#SpeakerName`
    if (trimmed.startsWith('#')) {
      currentSpeaker = trimmed.slice(1).trim();
      continue;
    }

    // glink choice: [glink ... text="Choice text" ...]
    const glinkMatch = trimmed.match(/\[glink\b[^\]]*\btext=["']([^"']+)["'][^\]]*\]/i);
    if (glinkMatch) {
      const choiceText = glinkMatch[1];
      const { maskedText, tags } = maskTyranoTags(choiceText);
      extracted.push({
        id: `${baseName}#line_${lineIdx}`,
        file: baseName,
        lineIndex: lineIdx,
        type: 'VN Choice (glink)',
        pattern: 'glink',
        originalText: choiceText,
        maskedText,
        tags,
        translatedText: '',
      });
      continue;
    }

    // Skip pure technical command lines: starting with `@` or purely `[command ...]` without dialogue
    if (trimmed.startsWith('@')) continue;
    if (trimmed.startsWith('[') && trimmed.endsWith(']') && !trimmed.includes('[p]') && !trimmed.includes('[l]')) {
      continue;
    }

    // Dialogue or Narration line
    // Strip terminal tags [p], [l], [r] to isolate dialogue
    const { maskedText, tags } = maskTyranoTags(trimmed);
    if (maskedText && maskedText.replace(/\[\[TAG_\d+\]\]/g, '').trim().length > 0) {
      extracted.push({
        id: `${baseName}#line_${lineIdx}`,
        file: baseName,
        lineIndex: lineIdx,
        speaker: currentSpeaker,
        type: currentSpeaker ? `Dialogue (${currentSpeaker})` : 'VN Narration',
        pattern: 'dialogue',
        originalText: trimmed,
        maskedText,
        tags,
        translatedText: '',
      });
    }
  }

  return extracted;
}

/**
 * Re-injects translated lines back into TyranoBuilder (.ks) script.
 */
export function injectTranslatedStringsTyrano(originalScript, stringEntries) {
  const lines = originalScript.split('\n');

  stringEntries.forEach((entry) => {
    if (!entry.translatedText || entry.lineIndex === undefined) return;
    const lineIdx = entry.lineIndex;
    const oldLine = lines[lineIdx];
    if (!oldLine) return;

    const cleanTranslation = unmaskTyranoTags(entry.translatedText, entry.tags);

    if (entry.pattern === 'glink') {
      lines[lineIdx] = oldLine.replace(
        /(\[glink\b[^\]]*\btext=["'])([^"']+)(["'][^\]]*\])/i,
        `$1${cleanTranslation}$3`
      );
    } else {
      lines[lineIdx] = cleanTranslation;
    }
  });

  return lines.join('\n');
}
