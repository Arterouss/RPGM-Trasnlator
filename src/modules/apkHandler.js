/**
 * Universal Game Engine Archive & Package Handler
 * Powered by @zip.js/zip.js
 * Automatically detects and extracts dialogue from:
 * 1. RPG Maker MV / MZ (assets/www/data/*.json, MapXXX.json, Actors.json, etc.)
 * 2. Ren'Py Visual Novels (assets/x-game/*.rpy, game/*.rpy, *.rpy)
 * 3. TyranoBuilder / KAG Scenario (data/scenario/*.ks, *.ks)
 * 4. Generic Indie Game Localization (*.json, strings.json, dialogue.json)
 */

import * as zip from '@zip.js/zip.js';
import { extractStringsFromRpgmJson, injectTranslatedStrings } from './rpgmParser.js';
import { extractStringsFromRenpyScript, injectTranslatedStringsRenpy } from './renpyParser.js';
import { extractStringsFromTyranoScript, injectTranslatedStringsTyrano } from './tyranoParser.js';
import { extractStringsFromGenericJson, injectTranslatedStringsGenericJson } from './genericJsonParser.js';
import { signApkInBrowser } from './apkSigner.js';

zip.configure({
  useWebWorkers: true,
});

/**
 * Detects the raw file extension
 */
export function detectFileType(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.apk')) return 'apk';
  if (name.endsWith('.zip')) return 'zip';
  if (name.endsWith('.json')) return 'json';
  if (name.endsWith('.rpy')) return 'rpy';
  if (name.endsWith('.ks')) return 'ks';
  return 'unknown';
}

/**
 * Universal Package Inspector & Dialogue Extractor
 */
export async function analyzeAndExtractPackage(file, onProgress = () => {}) {
  const fileType = detectFileType(file);
  const rawDataMap = new Map();
  const rawTextMap = new Map();
  const allStrings = [];
  const detectedFiles = [];

  // ==========================================
  // CASE 1: Single Script / Data File
  // ==========================================
  if (fileType === 'json') {
    onProgress('Menganalisis file JSON...');
    const text = await file.text();
    const json = JSON.parse(text);
    rawDataMap.set(file.name, json);
    detectedFiles.push(file.name);

    // Check if it's an RPG Maker MV/MZ file
    const isRpgm = /^(Map\d+|Actors|Classes|Skills|Items|Weapons|Armors|Enemies|Troops|States|System|CommonEvents)\.json$/i.test(
      file.name
    );

    let strings = [];
    let engine = 'generic_json';
    let engineName = 'Generic JSON Localization';
    let engineBadge = '📄 JSON Data';

    if (isRpgm) {
      engine = 'rpgm';
      engineName = 'RPG Maker MV / MZ';
      engineBadge = '🎮 RPG Maker';
      strings = extractStringsFromRpgmJson(file.name, json);
    } else {
      strings = extractStringsFromGenericJson(file.name, json);
    }

    allStrings.push(...strings);

    return {
      type: 'json',
      engine,
      engineName,
      engineBadge,
      filename: file.name,
      files: detectedFiles,
      allStrings,
      rawDataMap,
      rawTextMap,
    };
  }

  if (fileType === 'rpy') {
    onProgress('Menganalisis skrip Ren\'Py Visual Novel...');
    const text = await file.text();
    rawTextMap.set(file.name, text);
    detectedFiles.push(file.name);

    const strings = extractStringsFromRenpyScript(file.name, text);
    allStrings.push(...strings);

    return {
      type: 'rpy',
      engine: 'renpy',
      engineName: 'Ren\'Py Visual Novel',
      engineBadge: '📖 Ren\'Py VN',
      filename: file.name,
      files: detectedFiles,
      allStrings,
      rawDataMap,
      rawTextMap,
    };
  }

  if (fileType === 'ks') {
    onProgress('Menganalisis skrip TyranoBuilder KAG...');
    const text = await file.text();
    rawTextMap.set(file.name, text);
    detectedFiles.push(file.name);

    const strings = extractStringsFromTyranoScript(file.name, text);
    allStrings.push(...strings);

    return {
      type: 'ks',
      engine: 'tyrano',
      engineName: 'TyranoBuilder / KAG VN',
      engineBadge: '🎭 Tyrano VN',
      filename: file.name,
      files: detectedFiles,
      allStrings,
      rawDataMap,
      rawTextMap,
    };
  }

  // ==========================================
  // CASE 2: APK or ZIP Archive (Universal Sniffer)
  // ==========================================
  onProgress('Membuka struktur arsip berkas secara lokal di browser...');
  const zipReader = new zip.ZipReader(new zip.BlobReader(file));
  const entries = await zipReader.getEntries();

  // Engine Pattern Checkers (Recursive Search)
  // 1. Ren'Py: *.rpy scripts (assets/x-game/*.rpy, game/*.rpy, or any *.rpy)
  const renpyEntries = entries.filter((e) => !e.directory && /\.rpy$/i.test(e.filename));

  // 2. RPG Maker MV/MZ: MapXXX.json, Actors.json, System.json anywhere in archive
  const rpgmRegex = /(^|\/)(Map\d+|Actors|Classes|Skills|Items|Weapons|Armors|Enemies|Troops|States|System|CommonEvents)\.json$/i;
  const rpgmEntries = entries.filter((e) => !e.directory && rpgmRegex.test(e.filename));

  // 3. TyranoBuilder / KAG: *.ks files
  const tyranoEntries = entries.filter((e) => !e.directory && /\.ks$/i.test(e.filename));

  // 4. Generic Localization JSON: strings.json, dialogue.json, en.json, etc.
  const genericJsonRegex = /(^|\/)(locale|locales|lang|i18n|localization|strings|dialogue|texts|text|en|ja|id)\.json$/i;
  const genericJsonEntries = entries.filter((e) => !e.directory && genericJsonRegex.test(e.filename));

  let detectedEngine = 'unknown';
  let engineName = 'Tidak Dikenal';
  let engineBadge = '📦 Paket Game';
  let targetEntries = [];

  if (renpyEntries.length > 0) {
    detectedEngine = 'renpy';
    engineName = 'Ren\'Py Visual Novel';
    engineBadge = '📖 Ren\'Py VN';
    targetEntries = renpyEntries;
    onProgress(`Terdeteksi: ${engineName}! Ditemukan ${renpyEntries.length} file skrip .rpy...`);
  } else if (rpgmEntries.length > 0) {
    detectedEngine = 'rpgm';
    engineName = 'RPG Maker MV / MZ';
    engineBadge = '🎮 RPG Maker';
    targetEntries = rpgmEntries;
    onProgress(`Terdeteksi: ${engineName}! Ditemukan ${rpgmEntries.length} file data RPGM...`);
  } else if (tyranoEntries.length > 0) {
    detectedEngine = 'tyrano';
    engineName = 'TyranoBuilder / KAG VN';
    engineBadge = '🎭 Tyrano VN';
    targetEntries = tyranoEntries;
    onProgress(`Terdeteksi: ${engineName}! Ditemukan ${tyranoEntries.length} skrip .ks...`);
  } else if (genericJsonEntries.length > 0) {
    detectedEngine = 'generic_json';
    engineName = 'Indie Game Localization JSON';
    engineBadge = '📄 Game JSON';
    targetEntries = genericJsonEntries;
    onProgress(`Terdeteksi: ${engineName}! Ditemukan ${genericJsonEntries.length} file lokalisasi...`);
  } else {
    // If no specific match, look for any JSON in the zip
    const anyJson = entries.filter((e) => !e.directory && /\.json$/i.test(e.filename));
    if (anyJson.length > 0) {
      detectedEngine = 'generic_json';
      engineName = 'Generic Game JSON';
      engineBadge = '📄 Game JSON';
      targetEntries = anyJson;
      onProgress(`Mencoba memindai ${anyJson.length} file JSON umum...`);
    } else {
      await zipReader.close();
      throw new Error(
        'Format game belum dikenali. Sistem mendukung: RPG Maker (MV/MZ), Ren\'Py Visual Novel (.rpy), TyranoBuilder (.ks), atau file lokalisasi JSON.'
      );
    }
  }

  // Parse target entries according to the detected engine
  for (let i = 0; i < targetEntries.length; i++) {
    const entry = targetEntries[i];
    const shortName = entry.filename.split('/').pop();
    onProgress(`Membaca (${i + 1}/${targetEntries.length}): ${shortName}...`);

    if (detectedEngine === 'renpy') {
      const scriptText = await entry.getData(new zip.TextWriter());
      rawTextMap.set(entry.filename, scriptText);
      detectedFiles.push(entry.filename);
      const strings = extractStringsFromRenpyScript(entry.filename, scriptText);
      allStrings.push(...strings);
    } else if (detectedEngine === 'tyrano') {
      const scriptText = await entry.getData(new zip.TextWriter());
      rawTextMap.set(entry.filename, scriptText);
      detectedFiles.push(entry.filename);
      const strings = extractStringsFromTyranoScript(entry.filename, scriptText);
      allStrings.push(...strings);
    } else if (detectedEngine === 'rpgm') {
      const jsonText = await entry.getData(new zip.TextWriter());
      try {
        const jsonData = JSON.parse(jsonText);
        rawDataMap.set(entry.filename, jsonData);
        detectedFiles.push(entry.filename);
        const strings = extractStringsFromRpgmJson(entry.filename, jsonData);
        allStrings.push(...strings);
      } catch (err) {
        console.warn(`Gagal parse JSON ${entry.filename}:`, err);
      }
    } else {
      // Generic JSON
      const jsonText = await entry.getData(new zip.TextWriter());
      try {
        const jsonData = JSON.parse(jsonText);
        rawDataMap.set(entry.filename, jsonData);
        detectedFiles.push(entry.filename);
        const strings = extractStringsFromGenericJson(entry.filename, jsonData);
        allStrings.push(...strings);
      } catch (err) {
        console.warn(`Gagal parse JSON ${entry.filename}:`, err);
      }
    }
  }

  await zipReader.close();

  if (allStrings.length === 0) {
    throw new Error(
      `Berkas game terdeteksi (${engineName}), tetapi tidak ditemukan baris teks dialog yang dapat diekstrak.`
    );
  }

  return {
    type: fileType,
    engine: detectedEngine,
    engineName,
    engineBadge,
    filename: file.name,
    files: detectedFiles,
    allStrings,
    rawDataMap,
    rawTextMap,
    totalEntries: entries.length,
  };
}

/**
 * Universal Re-packaging and Signing Pipeline
 */
export async function repackPackage(
  originalFile,
  packageInfo,
  translatedStrings,
  onProgress = () => {}
) {
  const { type: fileType, engine, rawDataMap, rawTextMap } = packageInfo;

  // Group translated strings by filename
  const stringsByFile = new Map();
  translatedStrings.forEach((str) => {
    if (!stringsByFile.has(str.file)) {
      stringsByFile.set(str.file, []);
    }
    stringsByFile.get(str.file).push(str);
  });

  // Prepare updated JSON / Text map
  const updatedDataMap = new Map();

  // CASE: JSON based engines (rpgm, generic_json)
  if (rawDataMap && rawDataMap.size > 0) {
    for (const [filePath, originalJson] of rawDataMap.entries()) {
      const baseName = filePath.split('/').pop();
      const fileStrings = stringsByFile.get(baseName) || [];
      let updated = null;
      if (engine === 'rpgm') {
        updated = injectTranslatedStrings(originalJson, fileStrings);
      } else {
        updated = injectTranslatedStringsGenericJson(originalJson, fileStrings);
      }
      updatedDataMap.set(filePath, JSON.stringify(updated, null, 2));
    }
  }

  // CASE: Script based engines (renpy, tyrano)
  if (rawTextMap && rawTextMap.size > 0) {
    for (const [filePath, originalScript] of rawTextMap.entries()) {
      const baseName = filePath.split('/').pop();
      const fileStrings = stringsByFile.get(baseName) || [];
      let updatedScript = originalScript;
      if (engine === 'renpy') {
        updatedScript = injectTranslatedStringsRenpy(originalScript, fileStrings);
      } else if (engine === 'tyrano') {
        updatedScript = injectTranslatedStringsTyrano(originalScript, fileStrings);
      }
      updatedDataMap.set(filePath, updatedScript);
    }
  }

  // ==========================================
  // EXPORT: Single file output
  // ==========================================
  if (fileType === 'json') {
    onProgress('Mengemas berkas JSON hasil terjemahan...');
    const [, content] = updatedDataMap.entries().next().value;
    const blob = new Blob([content], { type: 'application/json' });
    return {
      blob,
      filename: originalFile.name.replace(/\.json$/i, '_id.json'),
      isSigned: false,
    };
  }

  if (fileType === 'rpy') {
    onProgress('Mengemas berkas skrip Ren\'Py...');
    const [, content] = updatedDataMap.entries().next().value;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    return {
      blob,
      filename: originalFile.name.replace(/\.rpy$/i, '_id.rpy'),
      isSigned: false,
    };
  }

  if (fileType === 'ks') {
    onProgress('Mengemas berkas skrip TyranoBuilder...');
    const [, content] = updatedDataMap.entries().next().value;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    return {
      blob,
      filename: originalFile.name.replace(/\.ks$/i, '_id.ks'),
      isSigned: false,
    };
  }

  // ==========================================
  // EXPORT: APK or ZIP Archive Repacking
  // ==========================================
  onProgress('Menyiapkan kompresi biner untuk mengemas ulang game...');
  const zipReader = new zip.ZipReader(new zip.BlobReader(originalFile));
  const entries = await zipReader.getEntries();

  const zipWriter = new zip.ZipWriter(new zip.BlobWriter(), {
    bufferedWrite: true,
    dataDescriptor: false,
    keepOrder: true,
  });
  const total = entries.length;

  for (let i = 0; i < total; i++) {
    const entry = entries[i];

    // Skip old signatures for clean re-signing
    if (
      fileType === 'apk' &&
      (/^META-INF\/.*\.(SF|RSA|DSA|EC)$/i.test(entry.filename) ||
        /^META-INF\/MANIFEST\.MF$/i.test(entry.filename))
    ) {
      continue;
    }

    // Handle directory entries explicitly
    if (entry.directory) {
      await zipWriter.add(entry.filename, null, {
        directory: true,
        bufferedWrite: true,
        dataDescriptor: false,
      });
      continue;
    }

    // ANDROID REQUIREMENTS FOR APK PARSING & RUNTIME ASSET LOADING:
    // 1. resources.arsc MUST be uncompressed (level: 0 / STORE) or Android AssetManager fails
    // 2. Native libraries (.so) MUST be STORED (level: 0)
    // 3. Media files in assets (.ogg, .mp3, .wav, .mp4, etc.) require STORED for openFd()
    // 4. Any entry that was uncompressed in the source APK MUST remain uncompressed
    // 5. CRITICAL: bufferedWrite: true, dataDescriptor: false MUST be enforced so local file headers
    //    contain exact sizes/CRC and NOT flags 0x0008, otherwise Android AssetManager fails to read
    //    assets/www/index.html resulting in a blank white screen!
    const isMediaFile = /\.(ogg|mp3|wav|mid|midi|m4a|mp4|webm|png|jpg|jpeg|gif)$/i.test(entry.filename);
    const shouldStoreUncompressed =
      entry.filename === 'resources.arsc' ||
      entry.filename.endsWith('.so') ||
      entry.compressionMethod === 0 ||
      (fileType === 'apk' && isMediaFile && entry.filename.startsWith('assets/'));

    const zipOptions = {
      level: shouldStoreUncompressed ? 0 : 5,
      bufferedWrite: true,
      dataDescriptor: false,
      lastModDate: entry.lastModDate || new Date(),
    };

    if (updatedDataMap.has(entry.filename)) {
      onProgress(`Menyisipkan terjemahan: ${entry.filename.split('/').pop()}...`);
      const newContent = updatedDataMap.get(entry.filename);
      await zipWriter.add(entry.filename, new zip.TextReader(newContent), zipOptions);
    } else {
      if (i % 25 === 0 || i === total - 1) {
        onProgress(`Menyusun ulang file game (${Math.round(((i + 1) / total) * 100)}%)...`);
      }
      const dataBlob = await entry.getData(new zip.BlobWriter());
      await zipWriter.add(entry.filename, new zip.BlobReader(dataBlob), zipOptions);
    }
  }

  onProgress('Menyelesaikan kompresi berkas...');
  const unsignedBlob = await zipWriter.close();
  await zipReader.close();

  // If ZIP, return directly
  if (fileType === 'zip') {
    const outputName = originalFile.name.replace(/\.zip$/i, '_id.zip');
    return {
      blob: unsignedBlob,
      filename: outputName,
      isSigned: false,
    };
  }

  // If APK, sign it directly in the browser!
  onProgress('Memulai penandatanganan digital APK (Auto-Sign Scheme v1, v2, v3 + 4-byte Zipalign)...');
  const signedBlob = await signApkInBrowser(unsignedBlob, onProgress);
  const outputName = originalFile.name.replace(/\.apk$/i, '_id.apk');

  return {
    blob: signedBlob,
    filename: outputName,
    isSigned: true,
  };
}
