/**
 * Ren'Py Visual Novel Script (.rpy) Parser & Reconstructor
 * Handles dialogue extraction, menu choices, and tag preservation for Ren'Py games.
 */

// Regex for Ren'Py text tags: {b}, {/b}, {i}, {/i}, {color=...}, {/color}, {size=...}, [variable], \n, \", etc.
const RENPY_TAG_REGEX = /(\{[a-zA-Z0-9_=#.-]+\}|\[[a-zA-Z0-9_.]+\]|\\n|\\"|\\\\)/g;

/**
 * Masks Ren'Py formatting and interpolation tags before translation.
 * e.g., 'e "Hello {b}[player_name]{/b}!"' -> 'e "Hello [[TAG_0]][[TAG_1]][[TAG_2]]!"'
 */
export function maskRenpyTags(text) {
  if (typeof text !== 'string') return { maskedText: '', tags: [] };
  const tags = [];
  const maskedText = text.replace(RENPY_TAG_REGEX, (match) => {
    const placeholder = `[[TAG_${tags.length}]]`;
    tags.push(match);
    return placeholder;
  });
  return { maskedText, tags };
}

/**
 * Restores Ren'Py tags in translated text.
 */
export function unmaskRenpyTags(text, tags) {
  if (typeof text !== 'string' || !tags || !tags.length) return text || '';
  let result = text;
  tags.forEach((tag, index) => {
    const tagPattern = new RegExp(`\\[\\[\\s*TAG[_-]${index}\\s*\\]\\]`, 'gi');
    result = result.replace(tagPattern, () => tag);
  });
  return result;
}

/**
 * Extracts translatable lines from a Ren'Py (.rpy) script.
 * Supports:
 * - Dialogue with speaker: `e "Dialogue text"` or `character "Dialogue"`
 * - Narration: `"Narration text"`
 * - Menu options: `"Choice text":` inside `menu:` blocks
 * - Localized strings: `_("Translatable string")`
 * 
 * @param {string} filename - Filename / path (e.g., 'script.rpy').
 * @param {string} scriptContent - The raw .rpy text content.
 * @returns {Array} List of extracted string entries.
 */
export function extractStringsFromRenpyScript(filename, scriptContent) {
  const extracted = [];
  const baseName = filename.split('/').pop();
  const lines = scriptContent.split('\n');

  // Patterns for matching Ren'Py statements
  // 1. Dialogue with character identifier: `e "Text here"` or `character_name "Text here"`
  const charDialogueRegex = /^(\s*)([a-zA-Z0-9_]+)\s+"((?:[^"\\]|\\.)+)"(.*)$/;

  // 2. Narration (string only at beginning of line): `"Text here"`
  const narrationRegex = /^(\s*)"((?:[^"\\]|\\.)+)"(.*)$/;

  // 3. Menu choice: `"Choice title":` or `_("Choice title"):`
  const menuChoiceRegex = /^(\s*)(?:"((?:[^"\\]|\\.)+)"|_\("((?:[^"\\]|\\.)+)"\)):\s*(?:#.*)?$/;

  // 4. Translatable string wrapper: `_("Translatable text")`
  const gettextRegex = /^(\s*.*?)_\("((?:[^"\\]|\\.)+)"\)(.*)$/;

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    const trimmed = line.trim();

    // Skip empty lines, python code comments, or renpy control keywords
    if (!trimmed || trimmed.startsWith('#')) continue;
    if (trimmed.startsWith('init ') || trimmed.startsWith('image ') || trimmed.startsWith('define ') || trimmed.startsWith('default ')) {
      // Check if line contains a translatable string like define gui.text = _("...")
      const gettextMatch = line.match(gettextRegex);
      if (gettextMatch) {
        const rawText = gettextMatch[2];
        if (rawText && rawText.trim().length > 1) {
          const { maskedText, tags } = maskRenpyTags(rawText);
          extracted.push({
            id: `${baseName}#line_${lineIdx}`,
            file: baseName,
            lineIndex: lineIdx,
            type: 'Ren\'Py UI Text',
            pattern: 'gettext',
            originalText: rawText,
            maskedText,
            tags,
            translatedText: '',
          });
        }
      }
      continue;
    }

    // Check 1: Menu choice
    const menuMatch = line.match(menuChoiceRegex);
    if (menuMatch) {
      const choiceText = menuMatch[2] || menuMatch[3];
      if (choiceText && choiceText.trim().length > 0) {
        const { maskedText, tags } = maskRenpyTags(choiceText);
        extracted.push({
          id: `${baseName}#line_${lineIdx}`,
          file: baseName,
          lineIndex: lineIdx,
          type: 'Ren\'Py Choice',
          pattern: 'menu',
          originalText: choiceText,
          maskedText,
          tags,
          translatedText: '',
        });
        continue;
      }
    }

    // Check 2: Character Dialogue (e.g. `e "Hello world!"`)
    const charMatch = line.match(charDialogueRegex);
    if (charMatch) {
      const speaker = charMatch[2];
      const dialogueText = charMatch[3];

      // Avoid catching renpy commands like `show "image"` or `play music "bgm.ogg"`
      const nonDialogueCommands = ['play', 'stop', 'queue', 'scene', 'show', 'hide', 'with', 'jump', 'call', 'return', 'voice'];
      if (!nonDialogueCommands.includes(speaker.toLowerCase())) {
        const { maskedText, tags } = maskRenpyTags(dialogueText);
        extracted.push({
          id: `${baseName}#line_${lineIdx}`,
          file: baseName,
          lineIndex: lineIdx,
          speaker,
          type: `Dialogue (${speaker})`,
          pattern: 'dialogue',
          originalText: dialogueText,
          maskedText,
          tags,
          translatedText: '',
        });
        continue;
      }
    }

    // Check 3: Narration (e.g. `"The morning breeze felt crisp."`)
    const narrMatch = line.match(narrationRegex);
    if (narrMatch) {
      const narrText = narrMatch[2];
      const { maskedText, tags } = maskRenpyTags(narrText);
      extracted.push({
        id: `${baseName}#line_${lineIdx}`,
        file: baseName,
        lineIndex: lineIdx,
        type: 'Ren\'Py Narration',
        pattern: 'narration',
        originalText: narrText,
        maskedText,
        tags,
        translatedText: '',
      });
      continue;
    }
  }

  return extracted;
}

/**
 * Re-injects translated strings back into the Ren'Py script text.
 * @param {string} originalScript - The original .rpy text.
 * @param {Array} stringEntries - List of translated entries with translatedText.
 * @returns {string} The modified .rpy script content.
 */
export function injectTranslatedStringsRenpy(originalScript, stringEntries) {
  const lines = originalScript.split('\n');

  stringEntries.forEach((entry) => {
    if (!entry.translatedText || entry.lineIndex === undefined) return;
    const lineIdx = entry.lineIndex;
    const oldLine = lines[lineIdx];
    if (!oldLine) return;

    // Restore tags in the translated text
    let cleanTranslation = unmaskRenpyTags(entry.translatedText, entry.tags);
    // Escape internal unescaped double quotes to prevent syntax error in Ren'Py
    cleanTranslation = cleanTranslation.replace(/(?<!\\)"/g, '\\"');

    // Safe replacement of the original quoted string on that line
    if (entry.pattern === 'dialogue') {
      // Format: [indent][speaker] "[text]"[suffix]
      const regex = new RegExp(`^(\\s*${entry.speaker}\\s+)"(?:[^"\\\\]|\\\\.)*"(.*)$`);
      if (regex.test(oldLine)) {
        lines[lineIdx] = oldLine.replace(regex, `$1"${cleanTranslation}"$2`);
      }
    } else if (entry.pattern === 'narration') {
      // Format: [indent]"[text]"[suffix]
      const regex = /^(\s*)"(?:[^"\\]|\\.)*"(.*)$/;
      if (regex.test(oldLine)) {
        lines[lineIdx] = oldLine.replace(regex, `$1"${cleanTranslation}"$2`);
      }
    } else if (entry.pattern === 'menu') {
      // Format: [indent]"[choice]":
      const regex = /^(\s*)"(?:[^"\\]|\\.)*":(\s*(?:#.*)?)$/;
      if (regex.test(oldLine)) {
        lines[lineIdx] = oldLine.replace(regex, `$1"${cleanTranslation}":$2`);
      }
    } else if (entry.pattern === 'gettext') {
      // Format: _("[text]")
      const regex = /_\("(?:[^"\\]|\\.)*"\)/;
      lines[lineIdx] = oldLine.replace(regex, `_("${cleanTranslation}")`);
    }
  });

  return lines.join('\n');
}
