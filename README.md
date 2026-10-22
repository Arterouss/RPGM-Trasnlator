# RPGM Translator — In-Browser Android APK Localizer

Aplikasi web modern untuk menerjemahkan game **RPG Maker (MV & MZ)** ke dalam Bahasa Indonesia secara otomatis, cepat, dan hemat kuota. Seluruh pemrosesan arsip game dan penandatanganan digital APK dilakukan **100% di sisi klien (Client-Side)** di dalam browser pengguna.

---

## 🌟 Fitur Utama

- **100% Client-Side Processing (0 MB Kuota Terbuang)**  
  File APK sebesar 500 MB – 1 GB tidak diunggah ke server internet. Browser membuka arsip APK secara lokal menggunakan `@zip.js/zip.js`, hanya membaca teks percakapan JSON di folder `assets/www/data/`, dan hanya mengirim baris teks untuk diterjemahkan.

- **In-Browser APK Digital Signer (Auto-Sign v1/v2)**  
  APK yang telah dimodifikasi otomatis dibersihkan dari sertifikat lama (`META-INF/`) dan ditandatangani ulang (_re-signed_) langsung di browser menggunakan `@chromeos/android-package-signer` (mendukung Scheme v1, v2, dan Zipalign 4-byte). File APK yang dihasilkan valid dan siap diinstal langsung di HP Android.

- **Perlindungan Sintaks & Escape Code RPG Maker**  
  Dilengkapi parser khusus yang melindungi kode-kode format game seperti `\N[1]` (nama karakter), `\C[2]` (warna teks), `\V[n]` (variabel), dan `\I[n]` (ikon) dengan sistem masking agar tidak dirusak atau salah diartikan oleh mesin penerjemah.

- **Pilihan Mesin Penerjemah (Multi-Engine)**:
  1. **Google Gemini AI (Gemini 2.5 Flash)**: Terjemahan berkualitas tinggi yang memahami konteks dialog game fantasi/RPG.
  2. **MyMemory Web API**: Penerjemahan gratis langsung tanpa perlu API key.
  3. **Offline Mock Simulator**: Simulasi cepat untuk demonstrasi dan uji coba tanpa koneksi internet.

- **Studio Editor & Pratinjau Teks (Side-by-Side)**  
  Tabel perbandingan interaktif teks asli vs bahasa Indonesia dengan pencarian instan, filter kategori (Dialog NPC, Item, Skill, Sistem), dan kemampuan mengedit teks terjemahan secara manual sebelum mengekspor file.

- **Dukungan Berbagai Format Masukan**:
  - File APK Android (`.apk`)
  - Arsip ZIP data game / JoiPlay (`.zip`)
  - File JSON RPG Maker individual (`.json`, misal `Map001.json`, `Actors.json`)
  - **Quick Demo 1-Klik**: Dataset game mini built-in untuk pengujian langsung tanpa perlu menyiapkan file game.

- **Kamus Istilah Khusus (Custom Glossary)**  
  Memungkinkan pengguna mengunci terjemahan istilah tertentu (contoh: `Demon Lord` ➔ `Raja Iblis`, `Potion` ➔ `Ramuan`).

---

## 🛠️ Teknologi yang Digunakan

| Komponen                      | Teknologi                                                                                 |
| :---------------------------- | :---------------------------------------------------------------------------------------- |
| **Frontend Core**             | HTML5, Vanilla JavaScript (ES Modules)                                                    |
| **Styling**                   | Vanilla CSS (Minimalist Developer UI ala Linear / Vercel)                                 |
| **Bundler & Dev Server**      | [Vite 8](https://vite.dev/)                                                               |
| **Arsip & Manipulasi Biner**  | [`@zip.js/zip.js`](https://gildas-lormeau.github.io/zip.js/)                              |
| **APK Signing & Zipalign**    | [`@chromeos/android-package-signer`](https://github.com/chromeos/android-package-sign-js) |
| **Polyfill Node Environment** | `vite-plugin-node-polyfills`, `buffer`                                                    |
| **Typography**                | Inter & JetBrains Mono (Google Fonts)                                                     |

---

## 🚀 Cara Menjalankan Proyek di Komputer Lokal

### Prasyarat

- [Node.js](https://nodejs.org/) versi 18 atau lebih baru.
- npm (bawaan dari Node.js).

### Langkah Instalasi

1. **Buka folder proyek** di terminal / command prompt:

   ```bash
   cd "d:/Kuliah/Web/RPGM Translator"
   ```

2. **Pasang seluruh dependensi**:

   ```bash
   npm install
   ```

3. **Jalankan server pengembangan (Development Server)**:

   ```bash
   npm run dev
   ```

4. **Buka aplikasi di browser**:
   Kunjungi alamat lokal yang ditampilkan, biasanya:

   ```
   http://localhost:5173/
   ```

5. **Membangun bundle produksi (Production Build)**:
   ```bash
   npm run build
   ```
   Hasil build siap deploy akan tersimpan di dalam folder `dist/`.

---

## 📂 Struktur Direktori Proyek

```
RPGM Translator/
├── dist/                      # Hasil kompilasi produksi
├── public/                    # Aset statis publik (favicon, hero, dll.)
├── src/
│   ├── modules/
│   │   ├── apkHandler.js      # Ekstraksi dan pengemasan ulang arsip APK/ZIP
│   │   ├── apkSigner.js       # Penandatanganan digital paket APK di browser
│   │   ├── rpgmParser.js      # Parser JSON RPG Maker MV/MZ & masking kode
│   │   ├── sampleData.js      # Dataset game mini untuk fitur Quick Demo
│   │   └── translator.js      # Pipeline terjemahan (Gemini AI, MyMemory, Simulator)
│   ├── main.js                # Controller utama aplikasi dan event listener
│   └── style.css              # Sistem desain CSS minimalis dan responsif
├── index.html                 # Struktur markup utama aplikasi
├── package.json               # Konfigurasi dependensi dan skrip proyek
├── vite.config.js             # Konfigurasi bundler Vite dan Node polyfills
└── README.md                  # Dokumentasi proyek
```

---

## 🔄 Alur Pemrosesan (Architecture Pipeline)

```
[ Berkas APK Pengguna ]
        │
        ▼ (Dibaca lokal dengan @zip.js/zip.js)
[ Ekstraksi 'assets/www/data/*.json' ]
        │
        ▼ (Masking kode escape \N[n], \C[n], \V[n])
[ Penerjemahan Teks via Gemini AI / Provider ]
        │
        ▼ (Unmasking kode & injeksi ke JSON baru)
[ Timpa File JSON di Memori Browser ]
        │
        ▼ (Hapus META-INF/ lama + Re-sign via PackageSigner)
[ Valid Signed APK (.apk) ]
        │
        ▼
[ Unduh langsung ke HP / Komputer ]
```

---

## 📱 Panduan Menginstal APK Hasil Terjemahan di HP Android

1. **Hapus Game Versi Lama (Jika Sudah Terpasang)**  
   Jika game versi asli sebelumnya sudah pernah terpasang di HP Anda, **uninstall terlebih dahulu**. Android tidak mengizinkan penimpaan aplikasi jika tanda tangan digitalnya berbeda dari publisher aslinya.

2. **Buka File APK yang Selesai Diunduh**  
   Buka notifikasi unduhan browser atau cari berkas `_id.apk` di folder `Download/` menggunakan File Manager HP Anda.

3. **Izinkan Instalasi dari Sumber Tak Dikenal**  
   Bila muncul peringatan keamanan standar Android:

   > Ketuk **Setelan (Settings)** ➔ Aktifkan **"Izinkan dari sumber ini"** ➔ Kembali dan ketuk **Instal**.

4. **Buka dan Mainkan**  
   Game akan langsung berjalan dengan dialog cerita, nama item, skill, dan menu dalam Bahasa Indonesia.

---
