/**
 * In-Browser Android Universal APK Signer & Zipalign Engine
 * Powered by apk_sign_ts + node-forge
 * Generates valid v1 (JAR Scheme), v2 (APK Signature Scheme v2), and v3 (APK Signature Scheme v3)
 * with strict Android 4-byte boundary alignment for resources.arsc and 4096-byte alignment for .so libraries.
 */

import { ApkSigner, SigningKey } from 'apk_sign_ts';
import forge from 'node-forge';

const STORAGE_KEY_KEY = 'rpgm_apk_private_key_pem';
const STORAGE_KEY_CERT = 'rpgm_apk_cert_pem';

/**
 * Retrieves an existing RSA 2048-bit key & X.509 cert from localStorage,
 * or generates a fresh compliant self-signed key pair.
 */
export function getOrCreateSigningKey(onStatus = () => {}) {
  try {
    const cachedKey = localStorage.getItem(STORAGE_KEY_KEY);
    const cachedCert = localStorage.getItem(STORAGE_KEY_CERT);

    if (cachedKey && cachedCert) {
      onStatus('Menggunakan sertifikat tanda tangan digital yang tersimpan...');
      return SigningKey.fromPEM(cachedKey, cachedCert);
    }
  } catch (err) {
    console.warn('Gagal membaca localStorage:', err);
  }

  onStatus('Membuat kunci sertifikat tanda tangan digital APK baru (RSA 2048-bit + X.509)...');

  // 1. Generate RSA 2048-bit key pair
  const keys = forge.pki.rsa.generateKeyPair(2048);

  // Convert to PKCS#8 PEM format (required by WebCrypto subtle.importKey)
  const rsaPrivateKeyAsn1 = forge.pki.privateKeyToAsn1(keys.privateKey);
  const pkcs8 = forge.pki.wrapRsaPrivateKey(rsaPrivateKeyAsn1);
  const privateKeyPem = forge.pki.privateKeyInfoToPem(pkcs8);

  // 2. Generate self-signed X.509 certificate valid for 30 years
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01' + Date.now().toString(16);
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 30);

  const attrs = [
    { name: 'commonName', value: 'RPGM Auto Translator' },
    { name: 'countryName', value: 'ID' },
    { shortName: 'ST', value: 'Jakarta' },
    { name: 'localityName', value: 'Jakarta' },
    { name: 'organizationName', value: 'RPGM Indonesia Community' },
    { shortName: 'OU', value: 'Localization Engine' },
  ];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(keys.privateKey, forge.md.sha256.create());

  const certPem = forge.pki.certificateToPem(cert);

  try {
    localStorage.setItem(STORAGE_KEY_KEY, privateKeyPem);
    localStorage.setItem(STORAGE_KEY_CERT, certPem);
  } catch (err) {
    console.warn('Gagal menyimpan sertifikat ke localStorage:', err);
  }

  onStatus('Kunci digital baru (v1 + v2 + v3 Scheme) siap digunakan.');
  return SigningKey.fromPEM(privateKeyPem, certPem);
}

/**
 * Signs an APK Blob directly in the browser with full v1, v2, v3 schemes and zipalign.
 * @param {Blob} apkBlob - The unsigned repacked APK Blob.
 * @param {Function} onStatus - Callback for status updates.
 * @returns {Promise<Blob>} The signed, zipaligned APK ready for installation on modern Android.
 */
export async function signApkInBrowser(apkBlob, onStatus = () => {}) {
  try {
    onStatus('Mempersiapkan data biner APK untuk penandatanganan...');
    const arrayBuffer = await apkBlob.arrayBuffer();
    const apkData = new Uint8Array(arrayBuffer);

    onStatus('Memuat kunci sertifikat tanda tangan digital...');
    const signingKey = getOrCreateSigningKey(onStatus);

    onStatus('Menandatangani paket APK secara digital (v1 JAR + v2 Block + v3 Scheme + 4-byte Zipalign)...');
    const signer = new ApkSigner({
      signingKey,
      jarKeyName: 'CERT',
      digestAlgorithm: 'SHA-256',
    });

    const { signedApk, signatureSize } = await signer.sign(apkData);
    console.log(`[APK Signer] Selesai menandatangani: ${signedApk.length} bytes (blok tanda tangan: ${signatureSize} bytes)`);

    onStatus('APK berhasil ditandatangani dan siap diinstal di Android!');
    return new Blob([signedApk], {
      type: 'application/vnd.android.package-archive',
    });
  } catch (err) {
    console.error('Error signing APK in browser:', err);
    throw new Error(`Gagal menandatangani APK: ${err.message || err}`);
  }
}
