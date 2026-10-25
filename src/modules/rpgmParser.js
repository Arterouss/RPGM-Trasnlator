/**
 * RPG Maker MV / MZ JSON Parser & Reconstructor
 * Handles text extraction and re-injection while preserving formatting tags.
 */

// Regex for RPG Maker escape codes (\V[n], \N[n], \P[n], \C[n], \I[n], etc.)
const ESCAPE_TAG_REGEX = /(\\[A-Za-z]+\[\d+\]|\\[A-Za-z]+|\\\{|\\\}|\\<|\\>|\\!|\\\.|\b\\\||\\\^|\\\$|\\\\)/g;

/**
 * Protects RPG Maker special tags before sending text to AI/translation.
 * e.g., "\N[1]: Hello \C[2]Hero\C[0]!" -> "[[TAG_0]]: Hello [[TAG_1]]Hero[[TAG_2]]!"
 */
export function maskEscapeTags(text) {
  if (typeof text !== 'string') return { maskedText: '', tags: [] };
  const tags = [];
  const maskedText = text.replace(ESCAPE_TAG_REGEX, (match) => {
    const placeholder = `[[TAG_${tags.length}]]`;
    tags.push(match);
    return placeholder;
  });
  return { maskedText, tags };
}

/**
 * Restores protected RPG Maker tags back into translated text.
 */
export function unmaskEscapeTags(text, tags) {
  if (typeof text !== 'string' || !tags || !tags.length) return text || '';
  let result = text;
  tags.forEach((tag, index) => {
    // Match [[TAG_n]] or loose variations AI might return like [[TAG_n ]] or [[TAG-n]]
    const tagPattern = new RegExp(`\\[\\[\\s*TAG[_-]${index}\\s*\\]\\]`, 'gi');
    result = result.replace(tagPattern, () => tag);
  });
  return result;
}

/**
 * Inspects a JSON file from RPG Maker and extracts all translatable strings.
 * Returns an array of items: { id, file, path, originalText, maskedText, tags, type }
 */
export function extractStringsFromRpgmJson(filename, jsonData) {
  const extracted = [];
  const baseName = filename.split('/').pop();

  // Helper to record a string
  function record(path, text, type, context = '') {
    if (typeof text !== 'string' || !text.trim()) return;
    const { maskedText, tags } = maskEscapeTags(text);
    extracted.push({
      id: `${baseName}#${path.join('.')}`,
      file: baseName,
      path,
      originalText: text,
      maskedText,
      tags,
      translatedText: '',
      type,
      context,
    });
  }

  try {
    // 1. Map files: MapXXX.json
    if (/^Map\d+\.json$/i.test(baseName)) {
      if (jsonData && Array.isArray(jsonData.events)) {
        jsonData.events.forEach((event, eventIdx) => {
          if (!event || !Array.isArray(event.pages)) return;
          event.pages.forEach((page, pageIdx) => {
            if (!page || !Array.isArray(page.list)) return;
            page.list.forEach((cmd, cmdIdx) => {
              if (!cmd) return;
              // Code 401: Show Text (Dialogues)
              if (cmd.code === 401 && cmd.parameters && typeof cmd.parameters[0] === 'string') {
                record(
                  ['events', eventIdx, 'pages', pageIdx, 'list', cmdIdx, 'parameters', 0],
                  cmd.parameters[0],
                  'Dialogue',
                  `Event: ${event.name || 'EV' + event.id} (Page ${pageIdx + 1})`
                );
              }
              // Code 405: Show Scrolling Text
              else if (cmd.code === 405 && cmd.parameters && typeof cmd.parameters[0] === 'string') {
                record(
                  ['events', eventIdx, 'pages', pageIdx, 'list', cmdIdx, 'parameters', 0],
                  cmd.parameters[0],
                  'Scrolling Text',
                  `Event: ${event.name || 'EV' + event.id}`
                );
              }
              // Code 102: Show Choices
              else if (cmd.code === 102 && cmd.parameters && Array.isArray(cmd.parameters[0])) {
                cmd.parameters[0].forEach((choice, choiceIdx) => {
                  if (typeof choice === 'string') {
                    record(
                      ['events', eventIdx, 'pages', pageIdx, 'list', cmdIdx, 'parameters', 0, choiceIdx],
                      choice,
                      'Choice Option',
                      `Choice in ${event.name || 'Event'}`
                    );
                  }
                });
              }
            });
          });
        });
      }
    }

    // 2. CommonEvents.json
    else if (/^CommonEvents\.json$/i.test(baseName)) {
      if (Array.isArray(jsonData)) {
        jsonData.forEach((ce, ceIdx) => {
          if (!ce || !Array.isArray(ce.list)) return;
          if (ce.name) {
            record([ceIdx, 'name'], ce.name, 'Common Event Name');
          }
          ce.list.forEach((cmd, cmdIdx) => {
            if (!cmd) return;
            if (cmd.code === 401 && cmd.parameters && typeof cmd.parameters[0] === 'string') {
              record([ceIdx, 'list', cmdIdx, 'parameters', 0], cmd.parameters[0], 'Dialogue', `Common Event: ${ce.name}`);
            } else if (cmd.code === 405 && cmd.parameters && typeof cmd.parameters[0] === 'string') {
              record([ceIdx, 'list', cmdIdx, 'parameters', 0], cmd.parameters[0], 'Scrolling Text');
            } else if (cmd.code === 102 && cmd.parameters && Array.isArray(cmd.parameters[0])) {
              cmd.parameters[0].forEach((choice, choiceIdx) => {
                record([ceIdx, 'list', cmdIdx, 'parameters', 0, choiceIdx], choice, 'Choice Option');
              });
            }
          });
        });
      }
    }

    // 3. Actors.json
    else if (/^Actors\.json$/i.test(baseName)) {
      if (Array.isArray(jsonData)) {
        jsonData.forEach((actor, idx) => {
          if (!actor) return;
          if (actor.name) record([idx, 'name'], actor.name, 'Actor Name');
          if (actor.nickname) record([idx, 'nickname'], actor.nickname, 'Actor Nickname');
          if (actor.profile) record([idx, 'profile'], actor.profile, 'Actor Profile / Bio');
        });
      }
    }

    // 4. Classes.json
    else if (/^Classes\.json$/i.test(baseName)) {
      if (Array.isArray(jsonData)) {
        jsonData.forEach((cls, idx) => {
          if (!cls) return;
          if (cls.name) record([idx, 'name'], cls.name, 'Class Name');
        });
      }
    }

    // 5. Skills.json
    else if (/^Skills\.json$/i.test(baseName)) {
      if (Array.isArray(jsonData)) {
        jsonData.forEach((skill, idx) => {
          if (!skill) return;
          if (skill.name) record([idx, 'name'], skill.name, 'Skill Name');
          if (skill.description) record([idx, 'description'], skill.description, 'Skill Description');
          if (skill.message1) record([idx, 'message1'], skill.message1, 'Battle Message');
          if (skill.message2) record([idx, 'message2'], skill.message2, 'Battle Message');
        });
      }
    }

    // 6. Items.json, Weapons.json, Armors.json
    else if (/^(Items|Weapons|Armors)\.json$/i.test(baseName)) {
      const typeLabel = baseName.replace('.json', '');
      if (Array.isArray(jsonData)) {
        jsonData.forEach((item, idx) => {
          if (!item) return;
          if (item.name) record([idx, 'name'], item.name, `${typeLabel} Name`);
          if (item.description) record([idx, 'description'], item.description, `${typeLabel} Description`);
        });
      }
    }

    // 7. Enemies.json
    else if (/^Enemies\.json$/i.test(baseName)) {
      if (Array.isArray(jsonData)) {
        jsonData.forEach((enemy, idx) => {
          if (!enemy) return;
          if (enemy.name) record([idx, 'name'], enemy.name, 'Enemy Name');
        });
      }
    }

    // 8. States.json
    else if (/^States\.json$/i.test(baseName)) {
      if (Array.isArray(jsonData)) {
        jsonData.forEach((state, idx) => {
          if (!state) return;
          if (state.name) record([idx, 'name'], state.name, 'Status Effect');
          ['message1', 'message2', 'message3', 'message4'].forEach((msgKey) => {
            if (state[msgKey]) record([idx, msgKey], state[msgKey], 'Status Message');
          });
        });
      }
    }

    // 9. System.json (UI commands, currency, terms)
    else if (/^System\.json$/i.test(baseName)) {
      if (jsonData && typeof jsonData === 'object') {
        if (jsonData.gameTitle) record(['gameTitle'], jsonData.gameTitle, 'Game Title');
        if (jsonData.currencyUnit) record(['currencyUnit'], jsonData.currencyUnit, 'Currency Unit');

        if (jsonData.terms && typeof jsonData.terms === 'object') {
          // System terms messages
          if (jsonData.terms.messages && typeof jsonData.terms.messages === 'object') {
            Object.keys(jsonData.terms.messages).forEach((k) => {
              record(['terms', 'messages', k], jsonData.terms.messages[k], 'System Message', `Term: ${k}`);
            });
          }
          // System terms basic commands
          if (Array.isArray(jsonData.terms.basic)) {
            jsonData.terms.basic.forEach((term, idx) => {
              record(['terms', 'basic', idx], term, 'System Basic Term');
            });
          }
          // System terms commands (Fight, Escape, Attack, Guard, Item, Skill, Equip, Status, Formation, Save, Game End, Options, Weapon, Armor, Key Item, Equip, Optimize, Clear, New Game, Continue)
          if (Array.isArray(jsonData.terms.commands)) {
            jsonData.terms.commands.forEach((cmd, idx) => {
              record(['terms', 'commands', idx], cmd, 'Menu Command');
            });
          }
          // System terms params (Max HP, Max MP, Attack, Defense, M.Attack, M.Defense, Agility, Luck)
          if (Array.isArray(jsonData.terms.params)) {
            jsonData.terms.params.forEach((param, idx) => {
              record(['terms', 'params', idx], param, 'Parameter Term');
            });
          }
        }
      }
    }
  } catch (err) {
    console.error(`Error extracting strings from ${filename}:`, err);
  }

  return extracted;
}

/**
 * Re-injects translated strings back into the JSON object.
 * Deeply traverses the path recorded during extraction.
 */
export function injectTranslatedStrings(jsonData, stringEntries) {
  // Clone to avoid side effects
  const modifiedJson = JSON.parse(JSON.stringify(jsonData));

  stringEntries.forEach((entry) => {
    if (!entry.translatedText) return;
    const finalCleanText = unmaskEscapeTags(entry.translatedText, entry.tags);

    let current = modifiedJson;
    for (let i = 0; i < entry.path.length - 1; i++) {
      const segment = entry.path[i];
      if (current[segment] === undefined || current[segment] === null) {
        return; // Path broken
      }
      current = current[segment];
    }
    const lastKey = entry.path[entry.path.length - 1];
    if (current && lastKey !== undefined) {
      current[lastKey] = finalCleanText;
    }
  });

  return modifiedJson;
}
