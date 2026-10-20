/**
 * In-Browser Android APK Signer Module
 * Powered by @chromeos/android-package-signer
 * Handles Keystore generation, Zipalign, and APK Digital Signing directly in the browser.
 */

import { PackageSigner } from '@chromeos/android-package-signer';
import { Buffer } from 'buffer';

const STORAGE_KEY_CERT = 'rpgm_keystore_base64';
const KEY_PASSWORD = 'rpgmtranslator2026';
const KEY_ALIAS = 'rpgmkey';

/**
 * Retrieves an existing Keystore or generates a new one.
 */
export async function getOrCreateSigningKey(onStatus = () => {}) {
  // Check local storage for cached keystore
  const cached = localStorage.getItem(STORAGE_KEY_CERT);
  if (cached) {
    onStatus('Menggunakan sertifikat tanda tangan digital yang tersimpan...');
    return cached;
  }

  onStatus('Membuat kunci sertifikat tanda tangan digital baru (RSA 2048-bit)...');
  const signer = new PackageSigner(KEY_PASSWORD, KEY_ALIAS);

  const base64Der = await signer.generateKey({
    commonName: 'RPGM Auto Translator',
    organizationName: 'RPGM Indonesia Community',
    organizationUnit: 'Localization Project',
    countryCode: 'ID',
    localityName: 'Jakarta',
    stateOrProvinceName: 'Indonesia',
  });

  localStorage.setItem(STORAGE_KEY_CERT, base64Der);
  onStatus('Kunci digital baru berhasil dibuat dan disimpan.');
  return base64Der;
}

/**
 * Signs an APK Blob directly in the browser.
 * @param {Blob} apkBlob - The unsigned APK Blob (with old META-INF stripped).
 * @param {Function} onStatus - Callback for status updates.
 * @returns {Promise<Blob>} The signed APK ready for installation on Android.
 */
export async function signApkInBrowser(apkBlob, onStatus = () => {}) {
  try {
    onStatus('Menyiapkan modul Android Package Signer...');
    const base64Keystore = await getOrCreateSigningKey(onStatus);

    onStatus('Menandatangani paket APK secara digital (v1/v2 Scheme + Zipalign)...');
    const signer = new PackageSigner(KEY_PASSWORD, KEY_ALIAS);

    // signPackage returns a base64 Data URL (data:application/zip;base64,...)
    const signedDataUrl = await signer.signPackage(
      apkBlob,
      base64Keystore,
      'RPGM Auto Translator Browser Engine v1.0'
    );

    onStatus('Mengonversi paket APK bertanda tangan ke binary...');
    // Convert base64 data URL to Blob
    const base64Data = signedDataUrl.split(',')[1];
    const binaryBuffer = Buffer.from(base64Data, 'base64');
    const signedBlob = new Blob([binaryBuffer], {
      type: 'application/vnd.android.package-archive',
    });

    onStatus('APK berhasil ditandatangani dan siap diinstal di Android!');
    return signedBlob;
  } catch (err) {
    console.error('Error signing APK in browser:', err);
    throw new Error(`Gagal menandatangani APK: ${err.message || err}`);
  }
}
