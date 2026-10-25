/**
 * Translation Pipeline Module
 * Supports Gemini 2.5/1.5 Flash AI, MyMemory Free Web API, and Smart Offline RPG Simulator.
 */

// Common RPG dictionary for offline simulator & glossary fallback
const RPG_SIMULATOR_DICT = {
  // System & Menus
  Fight: 'Tarung',
  Escape: 'Kabur',
  Attack: 'Serang',
  Guard: 'Bertahan',
  Item: 'Barang',
  Skill: 'Keahlian',
  Equip: 'Perlengkapan',
  Status: 'Status',
  Formation: 'Formasi',
  Save: 'Simpan',
  'Game End': 'Keluar Game',
  Options: 'Pengaturan',
  Weapon: 'Senjata',
  Armor: 'Pelindung',
  'Key Item': 'Barang Kunci',
  'New Game': 'Game Baru',
  Continue: 'Lanjutkan',
  'Always Dash': 'Selalu Berlari',
  'Command Remember': 'Ingat Perintah',
  'BGM Volume': 'Volume Musik (BGM)',
  'BGS Volume': 'Volume Efek Latar (BGS)',
  'ME Volume': 'Volume Jingle (ME)',
  'SE Volume': 'Volume Suara (SE)',
  Possession: 'Dimiliki',
  'Save to which file?': 'Simpan ke berkas yang mana?',
  'Load which file?': 'Muat berkas yang mana?',
  File: 'Berkas',
  'Max HP': 'Maks HP',
  'Max MP': 'Maks MP',
  Defense: 'Pertahanan',
  'M.Attack': 'Serangan Sihir',
  'M.Defense': 'Pertahanan Sihir',
  Agility: 'Kecepatan',
  Luck: 'Keberuntungan',

  // Characters & Classes
  Harold: 'Harold',
  Therese: 'Therese',
  Marsha: 'Marsha',
  'The Chosen Vanguard': 'Sang Pelopor Terpilih',
  'Arcane Scholar': 'Cendekiawan Misteri',
  'Shadow Walker': 'Pengembara Bayangan',

  // Items
  Potion: 'Ramuan Pemulih',
  'Magic Water': 'Air Suci Mana',
  'Antidote Herb': 'Herba Antiracun',
  'Phoenix Feather': 'Bulu Phoenix',

  // Skills
  'Cross Slash': 'Tebasan Silang',
  'Flame Burst': 'Ledakan Api',
  'Holy Blessing': 'Berkah Suci',

  // Common Event & Map phrases
  'Verdant Haven Village': 'Desa Naungan Hijau',
  'Village Elder': 'Tetua Desa',
  'Shopkeeper Fiona': 'Fiona si Pemilik Toko',
  'I will retrieve it immediately!': 'Aku akan segera mengambilnya kembali!',
  'Tell me more about the monster.': 'Ceritakan lebih banyak tentang monster itu.',
  'I need to prepare first.': 'Aku harus bersiap-siap dulu.',
};

/**
 * Translates an array of strings using the selected provider.
 * @param {Array<string>} textList - List of masked strings to translate.
 * @param {Object} options - { provider: 'gemini'|'openai'|'mymemory'|'simulator', apiKey, baseUrl, model, glossary, onProgress }
 */
export async function translateBatch(textList, options = {}) {
  const {
    provider = 'simulator',
    apiKey = '',
    baseUrl = 'https://api.openai.com/v1',
    model = 'gpt-4o-mini',
    glossary = {},
    onProgress = () => {},
  } = options;

  if (!textList || !textList.length) return [];

  if (provider === 'gemini' && apiKey) {
    return translateWithGemini(textList, apiKey, glossary, onProgress);
  } else if (provider === 'openai') {
    return translateWithOpenAICompatible(textList, {
      apiKey,
      baseUrl,
      model,
      glossary,
      onProgress,
    });
  } else if (provider === 'mymemory') {
    return translateWithMyMemory(textList, glossary, onProgress);
  } else {
    // Simulator mode (instant & offline)
    return simulateTranslate(textList, glossary, onProgress);
  }
}

/**
 * Translates texts using OpenAI-compatible Chat Completions API
 * Supports: OpenAI, DeepSeek, OpenRouter, Groq, Local Ollama, LM Studio, vLLM, etc.
 */
async function translateWithOpenAICompatible(textList, options = {}) {
  const {
    apiKey = '',
    baseUrl = 'https://api.openai.com/v1',
    model = 'gpt-4o-mini',
    glossary = {},
    onProgress = () => {},
  } = options;

  const BATCH_SIZE = 25;
  const results = [];
  const total = textList.length;

  // Normalize base URL endpoint: ensure /chat/completions suffix
  let endpoint = (baseUrl || 'https://api.openai.com/v1').trim().replace(/\/+$/, '');
  if (!endpoint.endsWith('/chat/completions')) {
    endpoint = `${endpoint}/chat/completions`;
  }

  const modelName = (model || 'gpt-4o-mini').trim();

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const chunk = textList.slice(i, i + BATCH_SIZE);

    const glossaryGuide = Object.keys(glossary).length
      ? `\nGlossary rules to strictly respect:\n${JSON.stringify(glossary, null, 2)}`
      : '';

    const systemPrompt = `You are a professional video game localization translator specializing in Japanese and English RPG / Visual Novel games.
Translate the input list of texts into natural, immersive Bahasa Indonesia suitable for a fantasy RPG or visual novel.
IMPORTANT RULES:
1. PRESERVE ALL PLACEHOLDER TAGS EXACTLY as they appear, e.g. [[TAG_0]], [[TAG_1]], etc. Do not translate, remove, or modify them.
2. Maintain fantasy RPG / VN gaming conventions (e.g. keep HP, MP, TP, Exp, Level, G, Quest as standard or use established Indonesian gaming terminology).
3. Translate dialogues with appropriate character tone (respectful elders, enthusiastic heroes, mysterious villains).
4. Output MUST be ONLY a valid JSON array of strings corresponding 1:1 in the exact same order and length as input. Do not include markdown codeblocks or explanation.
${glossaryGuide}`;

    const headers = {
      'Content-Type': 'application/json',
    };
    if (apiKey && apiKey.trim()) {
      headers['Authorization'] = `Bearer ${apiKey.trim()}`;
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: modelName,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: JSON.stringify(chunk) },
          ],
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error?.message || `OpenAI Compatible API Error: HTTP ${response.status} (${response.statusText})`
        );
      }

      const data = await response.json();
      const rawContent = data.choices?.[0]?.message?.content || '';
      let translatedChunk = [];

      try {
        translatedChunk = JSON.parse(rawContent);
      } catch {
        const cleaned = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
        translatedChunk = JSON.parse(cleaned);
      }

      if (Array.isArray(translatedChunk) && translatedChunk.length === chunk.length) {
        results.push(...translatedChunk);
      } else {
        console.warn('OpenAI format mismatch, falling back to simulator for this batch');
        chunk.forEach((item) => results.push(simulateSingleText(item, glossary)));
      }
    } catch (err) {
      console.warn(`OpenAI Compatible batch error (falling back to simulator):`, err.message);
      chunk.forEach((item) => results.push(simulateSingleText(item, glossary)));
    }

    onProgress(Math.min(i + chunk.length, total), total);
    await new Promise((r) => setTimeout(r, 200));
  }

  return results;
}

/**
 * Translates texts using Google Gemini API with smart batching and RPG-tailored instructions.
 */
async function translateWithGemini(textList, apiKey, glossary, onProgress) {
  const BATCH_SIZE = 25; // 25 strings per request to prevent token limits
  const results = [];
  const total = textList.length;

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const chunk = textList.slice(i, i + BATCH_SIZE);

    const glossaryGuide = Object.keys(glossary).length
      ? `\nGlossary rules to strictly respect:\n${JSON.stringify(glossary, null, 2)}`
      : '';

    const prompt = `You are a professional video game localization translator specializing in Japanese/English RPG Maker games.
Translate the following list of texts into natural, immersive Bahasa Indonesia suitable for a fantasy RPG.
IMPORTANT RULES:
1. PRESERVE ALL PLACEHOLDER TAGS EXACTLY as they appear, e.g. [[TAG_0]], [[TAG_1]], etc. Do not translate, remove, or modify them.
2. Maintain fantasy RPG gaming conventions (e.g. keep HP, MP, TP, Exp, Level, G, Quest as standard or use established Indonesian gaming terminology).
3. Translate dialogues with appropriate fantasy/adventure tone (respectful elders, enthusiastic heroes, mysterious villains).
4. Output MUST be ONLY a valid JSON array of strings corresponding 1:1 in the exact same order and length as input. Do not include markdown codeblocks or explanation.
${glossaryGuide}

Input texts:
${JSON.stringify(chunk)}`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.3,
              responseMimeType: 'application/json',
            },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Gemini API Error: HTTP ${response.status}`);
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      let translatedChunk = [];

      try {
        translatedChunk = JSON.parse(rawText);
      } catch {
        // Fallback cleanup if model wraps in json markdown
        const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        translatedChunk = JSON.parse(cleaned);
      }

      // If array length matches
      if (Array.isArray(translatedChunk) && translatedChunk.length === chunk.length) {
        results.push(...translatedChunk);
      } else {
        // Fallback: use simulated if malformed
        chunk.forEach((item) => results.push(simulateSingleText(item, glossary)));
      }
    } catch (err) {
      console.warn(`Gemini API batch error (falling back to simulator for this chunk):`, err.message);
      // Fallback for this chunk so the user process doesn't completely fail
      chunk.forEach((item) => results.push(simulateSingleText(item, glossary)));
    }

    onProgress(Math.min(i + chunk.length, total), total);
    // Slight pause to be polite to API limits
    await new Promise((r) => setTimeout(r, 200));
  }

  return results;
}

/**
 * Free translation via MyMemory API with rate limiting
 */
async function translateWithMyMemory(textList, glossary, onProgress) {
  const results = [];
  const total = textList.length;

  for (let i = 0; i < total; i++) {
    const text = textList[i];
    let translated = '';

    // Check glossary first
    if (glossary[text]) {
      translated = glossary[text];
    } else {
      try {
        const res = await fetch(
          `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|id`
        );
        const data = await res.json();
        if (data.responseStatus === 200 && data.responseData?.translatedText) {
          translated = data.responseData.translatedText;
        } else {
          translated = simulateSingleText(text, glossary);
        }
      } catch {
        translated = simulateSingleText(text, glossary);
      }
    }

    results.push(translated);
    onProgress(i + 1, total);
    // Rate limit delay (MyMemory allows ~1000 words/day free)
    await new Promise((r) => setTimeout(r, 120));
  }

  return results;
}

/**
 * Smart Offline RPG Simulator
 * Translates texts instantly without any internet/API delay.
 */
function simulateTranslate(textList, glossary, onProgress) {
  const results = [];
  const total = textList.length;

  textList.forEach((text, i) => {
    results.push(simulateSingleText(text, glossary));
    if (i % 10 === 0 || i === total - 1) {
      onProgress(i + 1, total);
    }
  });

  return Promise.resolve(results);
}

/**
 * Helper to simulate translation of a single RPG line
 */
function simulateSingleText(text, glossary = {}) {
  if (!text || typeof text !== 'string') return '';

  // 1. Check exact custom glossary
  if (glossary[text]) return glossary[text];

  // 2. Check exact built-in dictionary
  if (RPG_SIMULATOR_DICT[text]) return RPG_SIMULATOR_DICT[text];

  // 3. Known dialogue patterns
  let translated = text;

  // Patterns for demo
  const patterns = [
    {
      re: /Elder!\s*What happened here while I was away\?/i,
      rep: 'Tetua! Apa yang terjadi di sini selama aku pergi?',
    },
    {
      re: /Alas,\s*(\[\[TAG_\d+\]\])\.\.\.\s*The dark shadow has awaken in the Northern Ruins\./i,
      rep: 'Aduh, $1... Bayangan kegelapan telah bangkit di Reruntuhan Utara.',
    },
    {
      re: /The monsters raided our storage and stole the\s*(\[\[TAG_\d+\]\])Ancient Seal Stone(\[\[TAG_\d+\]\])!/i,
      rep: 'Para monster menyerbu gudang kita dan mencuri $1Batu Segel Kuno$2!',
    },
    {
      re: /Take these\s*(\[\[TAG_\d+\]\])(\[\[TAG_\d+\]\])300\s*(\[\[TAG_\d+\]\])(\[\[TAG_\d+\]\])\s*and some potions from the shop\.\s*May the gods protect you!/i,
      rep: 'Ambillah $1$2 300 $3$4 ini dan beberapa ramuan dari toko. Semoga para dewa melindungimu!',
    },
    {
      re: /Welcome to Verdant Supplies!\s*Are you gearing up for an expedition\?/i,
      rep: 'Selamat datang di Perlengkapan Hijau! Apakah Anda sedang bersiap untuk ekspedisi?',
    },
    {
      re: /We have top quality weapons forged from starlight ore\./i,
      rep: 'Kami memiliki senjata berkualitas terbaik yang ditempa dari bijih cahaya bintang.',
    },
    {
      re: /A brave young swordsman from the eastern province who dreams of restoring peace to the continent\./i,
      rep: 'Pendekar pedang muda yang pemberani dari provinsi timur yang bermimpi mengembalikan kedamaian benua.',
    },
    {
      re: /A brilliant mage researching ancient elemental magic in the Royal Academy\./i,
      rep: 'Penyihir jenius yang meneliti sihir elemen kuno di Akademi Kerajaan.',
    },
    {
      re: /A stealthy scout who moves through the shadows like a gentle breeze\./i,
      rep: 'Pengintai lincah yang bergerak di balik bayangan bagai hembusan angin sepoi-sepoi.',
    },
    {
      re: /Restores (\d+) HP to a single ally with soothing herbal extracts\./i,
      rep: 'Memulihkan $1 HP untuk satu rekan dengan sari tumbuhan herbal yang menenangkan.',
    },
    {
      re: /Restores (\d+) MP to a single ally with distilled crystal essence\./i,
      rep: 'Memulihkan $1 MP untuk satu rekan dengan ekstrak kristal murni.',
    },
    {
      re: /Cures poison and clears toxic afflictions from the body\./i,
      rep: 'Menyembuhkan racun dan membersihkan racun berbahaya dari tubuh.',
    },
    {
      re: /Revives a fallen ally with (\d+)% of their maximum health restored\./i,
      rep: 'Membangkitkan rekan yang gugur dengan memulihkan $1% dari kesehatan maksimal.',
    },
    {
      re: /Strikes a single foe twice with rapid blade slashes\./i,
      rep: 'Menyerang satu musuh dua kali dengan tebasan pedang kilat.',
    },
    {
      re: /Engulfs all enemies in an explosion of intense magical fire\./i,
      rep: 'Menyelimuti semua musuh dalam ledakan kobaran api sihir yang dahsyat.',
    },
    {
      re: /Bathes all party members in divine light, curing abnormal status effects\./i,
      rep: 'Menyelimuti seluruh anggota kelompok dengan cahaya suci, menyembuhkan status abnormal.',
    },
    { re: /unleashes %1!/i, rep: 'melancarkan %1!' },
    { re: /chants an ancient incantation for %1!/i, rep: 'merapalkan mantra kuno untuk %1!' },
    { re: /invokes %1 upon the party!/i, rep: 'memanggil %1 ke seluruh anggota tim!' },
  ];

  for (const p of patterns) {
    if (p.re.test(translated)) {
      return translated.replace(p.re, p.rep);
    }
  }

  // Common fantasy word replacements for arbitrary text
  const wordMap = {
    Hero: 'Pahlawan',
    Elder: 'Tetua',
    King: 'Raja',
    Queen: 'Ratu',
    Princess: 'Putri',
    Prince: 'Pangeran',
    Knight: 'Ksatria',
    Village: 'Desa',
    Kingdom: 'Kerajaan',
    Castle: 'Kastil',
    Ruins: 'Reruntuhan',
    Cave: 'Gua',
    Forest: 'Hutan',
    Monster: 'Monster',
    Dragon: 'Naga',
    Sword: 'Pedang',
    Shield: 'Perisai',
    Staff: 'Tongkat Sihir',
    Bow: 'Busur',
    Magic: 'Sihir',
    Mana: 'Mana',
    Health: 'Darah',
    Quest: 'Misi',
    Expedition: 'Ekspedisi',
    Treasure: 'Harta Karun',
    Chest: 'Peti',
    Gold: 'Koin Emas',
    Welcome: 'Selamat datang',
    'Thank you': 'Terima kasih',
    Please: 'Tolong',
    Help: 'Bantu',
    Hello: 'Halo',
    Goodbye: 'Selamat tinggal',
  };

  Object.entries(wordMap).forEach(([en, id]) => {
    const reg = new RegExp(`\\b${en}\\b`, 'gi');
    translated = translated.replace(reg, id);
  });

  return translated;
}
