/**
 * APK and ZIP Archive Processing Module
 * Powered by @zip.js/zip.js
 * Extracts RPG Maker JSON data, replaces them with translated versions,
 * strips old signature files, and coordinates signing.
 */

import * as zip from '@zip.js/zip.js';
import { extractStringsFromRpgmJson, injectTranslatedStrings } from './rpgmParser.js';
import { signApkInBrowser } from './apkSigner.js';

// Configure zip.js worker if needed
zip.configure({
  useWebWorkers: true,
});

/**
 * Detects the file format: 'apk', 'zip', or 'json'
 */
export function detectFileType(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.apk')) return 'apk';
  if (name.endsWith('.zip')) return 'zip';
  if (name.endsWith('.json')) return 'json';
  return 'unknown';
}

/**
 * Analyzes an uploaded file (APK, ZIP, or JSON) and extracts all translatable strings.
 * @param {File|Blob} file - The uploaded file.
 * @param {Function} onProgress - Status callback.
 * @returns {Promise<{ type: string, files: Array, allStrings: Array, rawDataMap: Map }>}
 */
export async function analyzeAndExtractPackage(file, onProgress = () => {}) {
  const fileType = detectFileType(file);
  const rawDataMap = new Map();
  const allStrings = [];
  const detectedFiles = [];

  // CASE 1: Single JSON file
  if (fileType === 'json') {
    onProgress('Membaca file JSON...');
    const text = await file.text();
    const json = JSON.parse(text);
    rawDataMap.set(file.name, json);
    detectedFiles.push(file.name);

    const strings = extractStringsFromRpgmJson(file.name, json);
    allStrings.push(...strings);

    return {
      type: 'json',
      filename: file.name,
      files: detectedFiles,
      allStrings,
      rawDataMap,
    };
  }

  // CASE 2: APK or ZIP Archive
  onProgress('Membuka struktur arsip berkas secara lokal di browser...');
  const zipReader = new zip.ZipReader(new zip.BlobReader(file));
  const entries = await zipReader.getEntries();

  // Find candidate RPG Maker JSON files
  // Supports: assets/www/data/*.json (standard APK)
  //           www/data/*.json
  //           data/*.json
  //           or root *.json (Actors.json, System.json, MapXXX.json)
  const candidateRegex = /(assets\/www\/data\/|www\/data\/|^data\/|^)(Map\d+|Actors|Classes|Skills|Items|Weapons|Armors|Enemies|Troops|States|System|CommonEvents)\.json$/i;

  const targetEntries = entries.filter((entry) => !entry.directory && candidateRegex.test(entry.filename));

  if (targetEntries.length === 0) {
    await zipReader.close();
    throw new Error(
      'Tidak ditemukan file data RPG Maker (MV/MZ) di dalam arsip ini. Pastikan file berisi folder assets/www/data/ atau data/.'
    );
  }

  onProgress(`Ditemukan ${targetEntries.length} file data RPG Maker! Mengekstrak teks...`);

  for (let i = 0; i < targetEntries.length; i++) {
    const entry = targetEntries[i];
    onProgress(`Membaca file (${i + 1}/${targetEntries.length}): ${entry.filename.split('/').pop()}...`);

    const jsonText = await entry.getData(new zip.TextWriter());
    try {
      const jsonData = JSON.parse(jsonText);
      rawDataMap.set(entry.filename, jsonData);
      detectedFiles.push(entry.filename);

      const strings = extractStringsFromRpgmJson(entry.filename, jsonData);
      allStrings.push(...strings);
    } catch (err) {
      console.warn(`Gagal mem-parse ${entry.filename}:`, err);
    }
  }

  await zipReader.close();

  return {
    type: fileType,
    filename: file.name,
    files: detectedFiles,
    allStrings,
    rawDataMap,
    totalEntries: entries.length,
  };
}

/**
 * Re-packs the archive with translated strings and signs it if APK.
 * @param {File|Blob} originalFile - The original APK or ZIP file.
 * @param {string} fileType - 'apk', 'zip', or 'json'.
 * @param {Map} rawDataMap - Original parsed JSON map.
 * @param {Array} translatedStrings - List of strings with translatedText populated.
 * @param {Function} onProgress - Status callback.
 * @returns {Promise<{ blob: Blob, filename: string, isSigned: boolean }>}
 */
export async function repackPackage(
  originalFile,
  fileType,
  rawDataMap,
  translatedStrings,
  onProgress = () => {}
) {
  // Group translated strings by filename
  const stringsByFile = new Map();
  translatedStrings.forEach((str) => {
    if (!stringsByFile.has(str.file)) {
      stringsByFile.set(str.file, []);
    }
    stringsByFile.get(str.file).push(str);
  });

  // Prepare updated JSON map
  const updatedJsonMap = new Map();
  for (const [filePath, originalJson] of rawDataMap.entries()) {
    const baseName = filePath.split('/').pop();
    const fileStrings = stringsByFile.get(baseName) || [];
    const updatedJson = injectTranslatedStrings(originalJson, fileStrings);
    updatedJsonMap.set(filePath, updatedJson);
  }

  // CASE 1: Single JSON export
  if (fileType === 'json') {
    onProgress('Mengemas file JSON hasil terjemahan...');
    const [filePath, updatedJson] = updatedJsonMap.entries().next().value;
    const jsonBlob = new Blob([JSON.stringify(updatedJson, null, 2)], {
      type: 'application/json',
    });
    const outputName = originalFile.name.replace(/\.json$/i, '_id.json');
    return {
      blob: jsonBlob,
      filename: outputName,
      isSigned: false,
    };
  }

  // CASE 2: APK or ZIP Archive Repacking
  onProgress('Menyiapkan kompresi biner untuk mengemas ulang game...');
  const zipReader = new zip.ZipReader(new zip.BlobReader(originalFile));
  const entries = await zipReader.getEntries();

  const zipWriter = new zip.ZipWriter(new zip.BlobWriter());
  const total = entries.length;

  for (let i = 0; i < total; i++) {
    const entry = entries[i];

    // If it's an APK, skip old META-INF signature files so we can sign cleanly!
    if (
      fileType === 'apk' &&
      (/^META-INF\/.*\.(SF|RSA|DSA|EC)$/i.test(entry.filename) ||
        /^META-INF\/MANIFEST\.MF$/i.test(entry.filename))
    ) {
      continue;
    }

    if (updatedJsonMap.has(entry.filename)) {
      onProgress(`Menyisipkan terjemahan: ${entry.filename.split('/').pop()}...`);
      const updatedJsonStr = JSON.stringify(updatedJsonMap.get(entry.filename));
      await zipWriter.add(entry.filename, new zip.TextReader(updatedJsonStr));
    } else {
      // Pass-through unchanged files (assets, graphics, audio, classes.dex, etc.)
      if (i % 20 === 0 || i === total - 1) {
        onProgress(`Menyusun ulang file game (${Math.round(((i + 1) / total) * 100)}%)...`);
      }
      const dataBlob = await entry.getData(new zip.BlobWriter());
      await zipWriter.add(entry.filename, new zip.BlobReader(dataBlob));
    }
  }

  onProgress('Menyelesaikan pengemasan berkas...');
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

  // If APK, sign it in browser!
  onProgress('Memulai proses Android Digital Signing di browser...');
  const signedBlob = await signApkInBrowser(unsignedBlob, onProgress);
  const outputName = originalFile.name.replace(/\.apk$/i, '_id.apk');

  return {
    blob: signedBlob,
    filename: outputName,
    isSigned: true,
  };
}
