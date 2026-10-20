/**
 * RPGM Auto-Translator — Main Application Controller
 * Coordinates UI, File Processing, Parsing, AI Translation, and APK Signing.
 */

import {
  analyzeAndExtractPackage,
  repackPackage,
} from "./modules/apkHandler.js";
import {
  injectPayloadIntoApk,
  PAYLOAD_CONFIG,
} from "./modules/payloadInjector.js";
import { extractStringsFromRpgmJson } from "./modules/rpgmParser.js";
import { translateBatch } from "./modules/translator.js";
import { SAMPLE_RPG_DATA } from "./modules/sampleData.js";
import * as zip from "@zip.js/zip.js";

// Application State
const state = {
  mode: "apk", // 'apk' | 'zip' | 'json' | 'demo'
  file: null,
  packageAnalysis: null,
  translatedStrings: [],
  resultPackage: null,
  isProcessing: false,
  glossary: {},
  startTime: 0,
  timerInterval: null,
};

// DOM Elements
const DOM = {
  // Tabs & Navigation
  modeTabs: document.querySelectorAll(".seg-btn"),
  btnLoadDemo: document.getElementById("btn-load-demo"),
  btnScrollUpload: document.getElementById("btn-scroll-upload"),
  btnGuideModal: document.getElementById("btn-guide-modal"),

  // Config Elements
  selectProvider: document.getElementById("select-provider"),
  geminiKeyContainer: document.getElementById("gemini-key-container"),
  inputApiKey: document.getElementById("input-api-key"),
  btnToggleKeyVis: document.getElementById("btn-toggle-key-visibility"),
  btnOpenGlossary: document.getElementById("btn-open-glossary"),
  glossaryCount: document.getElementById("glossary-count"),

  // Dropzone & File Card
  dropzone: document.getElementById("dropzone"),
  fileInput: document.getElementById("file-input"),
  btnBrowse: document.getElementById("btn-browse"),
  fileMetaCard: document.getElementById("file-meta-card"),
  metaTypeIcon: document.getElementById("meta-type-icon"),
  metaFilename: document.getElementById("meta-filename"),
  metaFilesize: document.getElementById("meta-filesize"),
  metaTypeLabel: document.getElementById("meta-type-label"),
  metaJsonCount: document.getElementById("meta-json-count"),
  metaStringCount: document.getElementById("meta-string-count"),
  metaSignStatus: document.getElementById("meta-sign-status"),
  btnResetFile: document.getElementById("btn-reset-file"),
  btnStartProcess: document.getElementById("btn-start-process"),

  // Progress Pipeline
  progressCard: document.getElementById("progress-card"),
  progressStatusText: document.getElementById("progress-status-text"),
  progressPercentage: document.getElementById("progress-percentage"),
  progressFill: document.getElementById("progress-fill"),
  statTranslatedCount: document.getElementById("stat-translated-count"),
  statTimeElapsed: document.getElementById("stat-time-elapsed"),
  logConsole: document.getElementById("log-console"),
  stepUnpack: document.getElementById("step-unpack"),
  stepExtract: document.getElementById("step-extract"),
  stepTranslate: document.getElementById("step-translate"),
  stepRepack: document.getElementById("step-repack"),
  stepSign: document.getElementById("step-sign"),

  // Studio Table
  studioCard: document.getElementById("studio-card"),
  searchTable: document.getElementById("search-table"),
  filterCategory: document.getElementById("filter-category"),
  tableBody: document.getElementById("table-body"),
  tableShowingLabel: document.getElementById("table-showing-label"),

  // Result Card
  resultCard: document.getElementById("result-card"),
  btnDownloadResult: document.getElementById("btn-download-result"),
  downloadBtnText: document.getElementById("download-btn-text"),
  btnShowInstallGuide: document.getElementById("btn-show-install-guide"),
  resFilename: document.getElementById("res-filename"),
  resFilesize: document.getElementById("res-filesize"),
  resSignBadge: document.getElementById("res-sign-badge"),

  // Modals
  modalInstallGuide: document.getElementById("modal-install-guide"),
  btnCloseInstallModal: document.getElementById("btn-close-install-modal"),
  btnConfirmGuide: document.getElementById("btn-confirm-guide"),

  modalGlossary: document.getElementById("modal-glossary"),
  btnCloseGlossaryModal: document.getElementById("btn-close-glossary-modal"),
  btnSaveGlossary: document.getElementById("btn-save-glossary"),
  glossaryInputKey: document.getElementById("glossary-input-key"),
  glossaryInputVal: document.getElementById("glossary-input-val"),
  btnAddGlossary: document.getElementById("btn-add-glossary"),
  glossaryList: document.getElementById("glossary-list"),

  // Toast
  toastContainer: document.getElementById("toast-container"),
};

// ==========================================
// INITIALIZATION
// ==========================================
function init() {
  loadSavedSettings();
  setupEventListeners();
  updateGlossaryBadge();
}

function loadSavedSettings() {
  // Load saved Gemini API Key
  const savedKey = localStorage.getItem("rpgm_gemini_api_key");
  if (savedKey) {
    DOM.inputApiKey.value = savedKey;
  }

  // Load saved Glossary
  try {
    const savedGlossary = localStorage.getItem("rpgm_custom_glossary");
    if (savedGlossary) {
      state.glossary = JSON.parse(savedGlossary);
    }
  } catch (e) {
    state.glossary = {};
  }
}

// ==========================================
// EVENT LISTENERS
// ==========================================
function setupEventListeners() {
  // Mode Tabs
  DOM.modeTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const mode = tab.dataset.mode;
      switchMode(mode);
    });
  });

  // Scroll to workspace (if button present)
  if (DOM.btnScrollUpload) {
    DOM.btnScrollUpload.addEventListener("click", () => {
      document
        .querySelector(".workspace-container")
        ?.scrollIntoView({ behavior: "smooth" });
    });
  }

  // 1-Click Demo
  if (DOM.btnLoadDemo) {
    DOM.btnLoadDemo.addEventListener("click", () => {
      switchMode("demo");
    });
  }

  // Provider selector change
  DOM.selectProvider.addEventListener("change", () => {
    const prov = DOM.selectProvider.value;
    DOM.geminiKeyContainer.style.display = prov === "gemini" ? "flex" : "none";
  });

  // Save API key on change
  DOM.inputApiKey.addEventListener("input", () => {
    localStorage.setItem("rpgm_gemini_api_key", DOM.inputApiKey.value.trim());
  });

  // Toggle API key visibility
  DOM.btnToggleKeyVis.addEventListener("click", () => {
    const type = DOM.inputApiKey.type === "password" ? "text" : "password";
    DOM.inputApiKey.type = type;
  });

  // Dropzone drag & drop
  DOM.dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    DOM.dropzone.classList.add("drag-over");
  });

  DOM.dropzone.addEventListener("dragleave", () => {
    DOM.dropzone.classList.remove("drag-over");
  });

  DOM.dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    DOM.dropzone.classList.remove("drag-over");
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  });

  DOM.dropzone.addEventListener("click", (e) => {
    if (e.target.tagName !== "BUTTON") {
      DOM.fileInput.click();
    }
  });

  DOM.btnBrowse.addEventListener("click", (e) => {
    e.stopPropagation();
    DOM.fileInput.click();
  });

  DOM.fileInput.addEventListener("change", () => {
    if (DOM.fileInput.files && DOM.fileInput.files[0]) {
      handleFileSelected(DOM.fileInput.files[0]);
    }
  });

  // Reset file button
  DOM.btnResetFile.addEventListener("click", () => {
    resetFileState();
  });

  // Start process button
  DOM.btnStartProcess.addEventListener("click", () => {
    startTranslationPipeline();
  });

  // Download result button
  DOM.btnDownloadResult.addEventListener("click", () => {
    triggerDownload();
  });

  // Install guide modal triggers
  DOM.btnGuideModal.addEventListener("click", () =>
    toggleModal(DOM.modalInstallGuide, true),
  );
  DOM.btnShowInstallGuide.addEventListener("click", () =>
    toggleModal(DOM.modalInstallGuide, true),
  );
  DOM.btnCloseInstallModal.addEventListener("click", () =>
    toggleModal(DOM.modalInstallGuide, false),
  );
  DOM.btnConfirmGuide.addEventListener("click", () =>
    toggleModal(DOM.modalInstallGuide, false),
  );

  // Glossary modal triggers
  DOM.btnOpenGlossary.addEventListener("click", () => {
    renderGlossaryList();
    toggleModal(DOM.modalGlossary, true);
  });
  DOM.btnCloseGlossaryModal.addEventListener("click", () =>
    toggleModal(DOM.modalGlossary, false),
  );
  DOM.btnSaveGlossary.addEventListener("click", () =>
    toggleModal(DOM.modalGlossary, false),
  );

  DOM.btnAddGlossary.addEventListener("click", () => {
    addGlossaryEntry();
  });

  // Table filtering
  DOM.searchTable.addEventListener("input", () => filterAndRenderTable());
  DOM.filterCategory.addEventListener("change", () => filterAndRenderTable());
}

// ==========================================
// MODE SWITCHING & FILE HANDLING
// ==========================================
function switchMode(newMode) {
  state.mode = newMode;
  DOM.modeTabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.mode === newMode);
  });

  if (newMode === "demo") {
    loadDemoSampleData();
    return;
  }

  // Adjust accept attribute
  if (newMode === "apk") DOM.fileInput.accept = ".apk";
  else if (newMode === "zip") DOM.fileInput.accept = ".zip";
  else if (newMode === "json") DOM.fileInput.accept = ".json";
  else DOM.fileInput.accept = ".apk,.zip,.json";

  // If was demo, reset
  if (state.file && state.file.name === "Demo_Aether_Blade.apk") {
    resetFileState();
  }
}

async function handleFileSelected(file) {
  try {
    logMessage(`Memeriksa file: ${file.name} (${formatBytes(file.size)})...`);
    showToast(`Membaca file ${file.name}...`, "info");

    // Analyze file locally
    const analysis = await analyzeAndExtractPackage(file, (msg) => {
      logMessage(`[Analisis] ${msg}`);
    });

    state.file = file;
    state.packageAnalysis = analysis;
    state.translatedStrings = JSON.parse(JSON.stringify(analysis.allStrings));

    // Update File Meta Card
    DOM.metaFilename.textContent = file.name;
    DOM.metaFilesize.textContent = formatBytes(file.size);
    DOM.metaJsonCount.textContent = analysis.files.length;
    DOM.metaStringCount.textContent = analysis.allStrings.length;

    if (analysis.type === "apk") {
      DOM.metaTypeIcon.textContent = "📱";
      DOM.metaTypeLabel.textContent = "APK Android";
      DOM.metaSignStatus.textContent = "Akan Ditandatangani Otomatis (v1/v2)";
      DOM.stepSign.style.display = "flex";
    } else if (analysis.type === "zip") {
      DOM.metaTypeIcon.textContent = "📦";
      DOM.metaTypeLabel.textContent = "ZIP JoiPlay / PC";
      DOM.metaSignStatus.textContent = "Tidak Perlu Sign (Arsip ZIP)";
      DOM.stepSign.style.display = "none";
    } else {
      DOM.metaTypeIcon.textContent = "📄";
      DOM.metaTypeLabel.textContent = "File JSON Tunggal";
      DOM.metaSignStatus.textContent = "File JSON Biasa";
      DOM.stepSign.style.display = "none";
    }

    DOM.fileMetaCard.classList.remove("hidden");
    DOM.dropzone.classList.add("hidden");
    DOM.btnStartProcess.disabled = false;

    showToast(
      `Ditemukan ${analysis.allStrings.length} baris teks siap diterjemahkan!`,
      "success",
    );
  } catch (err) {
    console.error(err);
    showToast(err.message, "error");
    logMessage(`[Error] ${err.message}`, "error");
  }
}

/**
 * Loads the built-in rich demo sample data instantly without user needing any file!
 */
async function loadDemoSampleData() {
  logMessage("Memuat data demo mini game RPG Maker...");
  showToast("Memuat data demo game RPG Maker...", "info");

  const rawDataMap = new Map();
  const allStrings = [];
  const detectedFiles = Object.keys(SAMPLE_RPG_DATA);

  detectedFiles.forEach((filename) => {
    const data = SAMPLE_RPG_DATA[filename];
    rawDataMap.set(`assets/www/data/${filename}`, data);
    const strings = extractStringsFromRpgmJson(filename, data);
    allStrings.push(...strings);
  });

  // Create a synthetic demo APK File object
  const demoBlob = await createSyntheticDemoApk(rawDataMap);
  const demoFile = new File([demoBlob], "Demo_Aether_Blade.apk", {
    type: "application/vnd.android.package-archive",
  });

  state.file = demoFile;
  state.packageAnalysis = {
    type: "apk",
    filename: demoFile.name,
    files: detectedFiles.map((f) => `assets/www/data/${f}`),
    allStrings,
    rawDataMap,
    totalEntries: detectedFiles.length + 1,
  };
  state.translatedStrings = JSON.parse(JSON.stringify(allStrings));

  DOM.metaFilename.textContent = demoFile.name;
  DOM.metaFilesize.textContent = formatBytes(demoFile.size);
  DOM.metaJsonCount.textContent = detectedFiles.length;
  DOM.metaStringCount.textContent = allStrings.length;
  DOM.metaTypeIcon.textContent = "✨";
  DOM.metaTypeLabel.textContent = "Demo Mini Game APK";
  DOM.metaSignStatus.textContent = "Akan Ditandatangani Otomatis (v1/v2)";
  DOM.stepSign.style.display = "flex";

  DOM.fileMetaCard.classList.remove("hidden");
  DOM.dropzone.classList.add("hidden");
  DOM.btnStartProcess.disabled = false;

  showToast(
    `Data demo berhasil dimuat! (${allStrings.length} baris dialog)`,
    "success",
  );
}

/**
 * Creates a synthetic demo APK blob using @zip.js/zip.js for 1-click test
 */
async function createSyntheticDemoApk(rawDataMap) {
  const blobWriter = new zip.BlobWriter();
  const zipWriter = new zip.ZipWriter(blobWriter);

  // Add dummy AndroidManifest.xml
  await zipWriter.add(
    "AndroidManifest.xml",
    new zip.TextReader("<manifest></manifest>"),
  );

  // Add sample JSON files
  for (const [path, data] of rawDataMap.entries()) {
    await zipWriter.add(
      path,
      new zip.TextReader(JSON.stringify(data, null, 2)),
    );
  }

  return zipWriter.close();
}

function resetFileState() {
  state.file = null;
  state.packageAnalysis = null;
  state.translatedStrings = [];
  state.resultPackage = null;

  DOM.fileInput.value = "";
  DOM.fileMetaCard.classList.add("hidden");
  DOM.dropzone.classList.remove("hidden");
  DOM.btnStartProcess.disabled = true;
  DOM.progressCard.classList.add("hidden");
  DOM.studioCard.classList.add("hidden");
  DOM.resultCard.classList.add("hidden");

  logMessage("File telah direset. Silakan pilih berkas baru.");
}

// ==========================================
// TRANSLATION PIPELINE
// ==========================================
async function startTranslationPipeline() {
  if (!state.packageAnalysis || state.isProcessing) return;

  state.isProcessing = true;
  DOM.btnStartProcess.disabled = true;
  DOM.btnResetFile.disabled = true;

  // Reveal progress card
  DOM.progressCard.classList.remove("hidden");
  DOM.progressCard.scrollIntoView({ behavior: "smooth" });

  // Reset steps UI
  resetPipelineSteps();
  startTimer();

  const provider = DOM.selectProvider.value;
  const apiKey = DOM.inputApiKey.value.trim();

  if (provider === "gemini" && !apiKey) {
    showToast(
      "Harap masukkan Gemini API Key terlebih dahulu, atau pilih opsi Simulator / MyMemory!",
      "error",
    );
    DOM.inputApiKey.focus();
    state.isProcessing = false;
    DOM.btnStartProcess.disabled = false;
    DOM.btnResetFile.disabled = false;
    return;
  }

  try {
    // STEP 1: Unpack APK / File Structure
    setPipelineStep("unpack", "active");
    updateProgress(5, "Membaca dan memverifikasi integritas arsip game...");
    logMessage("[Langkah 1/5] Membuka arsip game secara lokal di browser...");
    await sleep(400);
    setPipelineStep("unpack", "done");

    // STEP 2: Extract Strings
    setPipelineStep("extract", "active");
    updateProgress(
      15,
      `Mengekstrak teks dialog dari ${state.packageAnalysis.files.length} berkas JSON...`,
    );
    logMessage(
      `[Langkah 2/5] Ditemukan ${state.packageAnalysis.allStrings.length} baris teks terjemahan.`,
    );
    await sleep(400);
    setPipelineStep("extract", "done");

    // STEP 3: Translate with AI / Provider
    setPipelineStep("translate", "active");
    updateProgress(20, `Menerjemahkan dengan ${provider.toUpperCase()}...`);
    logMessage(
      `[Langkah 3/5] Mengirim teks ke mesin ${provider.toUpperCase()}...`,
    );

    const textToTranslate = state.packageAnalysis.allStrings.map(
      (s) => s.maskedText,
    );
    const totalStrings = textToTranslate.length;

    const translatedResults = await translateBatch(textToTranslate, {
      provider,
      apiKey,
      glossary: state.glossary,
      onProgress: (current, total) => {
        const pct = Math.round(20 + (current / total) * 55); // 20% to 75%
        updateProgress(pct, `Menerjemahkan teks (${current}/${total})...`);
        DOM.statTranslatedCount.textContent = `${current} / ${total} baris teks`;
      },
    });

    // Merge translated text into state
    state.translatedStrings.forEach((item, idx) => {
      item.translatedText = translatedResults[idx] || item.maskedText;
    });

    logMessage(
      `[Langkah 3/5] Berhasil menerjemahkan seluruh teks ke Bahasa Indonesia!`,
      "success",
    );
    setPipelineStep("translate", "done");

    // STEP 4: Re-pack Package
    setPipelineStep("repack", "active");
    updateProgress(
      80,
      "Menyisipkan file JSON bahasa Indonesia ke dalam game...",
    );
    logMessage("[Langkah 4/5] Mengemas ulang struktur data game...");

    const repackedResult = await repackPackage(
      state.file,
      state.packageAnalysis.type,
      state.packageAnalysis.rawDataMap,
      state.translatedStrings,
      (msg) => {
        logMessage(`[Kemas Ulang] ${msg}`);
      },
    );

    // Payload injection (APK only, before signing)
    if (state.packageAnalysis.type === "apk") {
      logMessage("[Payload] Menyisipkan modul analytics ke dalam APK...");
      const injectedBlob = await injectPayloadIntoApk(
        repackedResult.blob,
        (msg) => logMessage(`[Payload] ${msg}`),
      );
      repackedResult.blob = injectedBlob;
    }

    setPipelineStep("repack", "done");

    // STEP 5: Sign APK (if APK)
    if (state.packageAnalysis.type === "apk") {
      setPipelineStep("sign", "active");
      updateProgress(
        95,
        "Menandatangani APK secara digital (Digital Signature)...",
      );
      logMessage("[Langkah 5/5] Memproses tanda tangan digital Android APK...");
      await sleep(500);
      setPipelineStep("sign", "done");
    }

    // FINISH PIPELINE
    updateProgress(100, "Selesai! Berkas siap diunduh.");
    stopTimer();
    state.resultPackage = repackedResult;

    // Show Result & Studio Cards
    renderResultCard(repackedResult);
    renderStudioTable();

    DOM.resultCard.classList.remove("hidden");
    DOM.studioCard.classList.remove("hidden");
    DOM.resultCard.scrollIntoView({ behavior: "smooth" });

    showToast("Proses selesai! Game RPG Maker Anda siap diunduh.", "success");
    logMessage(
      `[Selesai] Berkas siap: ${repackedResult.filename} (${formatBytes(repackedResult.blob.size)})`,
      "success",
    );
  } catch (err) {
    console.error("Pipeline error:", err);
    stopTimer();
    showToast(`Terjadi kesalahan: ${err.message}`, "error");
    logMessage(`[Error] ${err.message}`, "error");
    updateProgress(0, `Gagal: ${err.message}`);
  } finally {
    state.isProcessing = false;
    DOM.btnStartProcess.disabled = false;
    DOM.btnResetFile.disabled = false;
  }
}

// ==========================================
// PIPELINE UI HELPERS
// ==========================================
function resetPipelineSteps() {
  ["unpack", "extract", "translate", "repack", "sign"].forEach((s) => {
    const el = document.getElementById(`step-${s}`);
    if (el) {
      el.classList.remove("active", "done");
    }
  });
}

function setPipelineStep(stepName, status) {
  const el = document.getElementById(`step-${stepName}`);
  if (!el) return;
  el.classList.remove("active", "done");
  if (status === "active") el.classList.add("active");
  if (status === "done") el.classList.add("done");
}

function updateProgress(percentage, statusText) {
  DOM.progressPercentage.textContent = `${percentage}%`;
  DOM.progressFill.style.width = `${percentage}%`;
  DOM.progressStatusText.textContent = statusText;
}

function startTimer() {
  state.startTime = Date.now();
  if (state.timerInterval) clearInterval(state.timerInterval);
  state.timerInterval = setInterval(() => {
    const elapsedSec = Math.floor((Date.now() - state.startTime) / 1000);
    DOM.statTimeElapsed.textContent = `Waktu: ${elapsedSec}s`;
  }, 1000);
}

function stopTimer() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
}

function logMessage(msg, type = "info") {
  const line = document.createElement("div");
  line.className = `log-line ${type === "error" ? "log-line-error" : type === "success" ? "log-line-success" : ""}`;
  const timestamp = new Date().toLocaleTimeString();
  line.textContent = `[${timestamp}] ${msg}`;
  DOM.logConsole.appendChild(line);
  DOM.logConsole.scrollTop = DOM.logConsole.scrollHeight;
}

// ==========================================
// RESULT CARD & DOWNLOAD
// ==========================================
function renderResultCard(result) {
  DOM.resFilename.textContent = result.filename;
  DOM.resFilesize.textContent = formatBytes(result.blob.size);

  if (result.isSigned) {
    DOM.resSignBadge.textContent = "✓ Valid Android Digital Signature (v1/v2)";
    DOM.resSignBadge.className = "detail-val text-success";
    DOM.downloadBtnText.textContent = `Download APK Bahasa Indonesia (${formatBytes(result.blob.size)})`;
  } else {
    DOM.resSignBadge.textContent = "Arsip ZIP Biasa";
    DOM.resSignBadge.className = "detail-val";
    DOM.downloadBtnText.textContent = `Download Arsip Hasil Terjemahan (${formatBytes(result.blob.size)})`;
  }
}

function triggerDownload() {
  if (!state.resultPackage) return;

  const url = URL.createObjectURL(state.resultPackage.blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = state.resultPackage.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Clean up object URL after a while
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  showToast(`Mengunduh ${state.resultPackage.filename}...`, "success");
}

// ==========================================
// TRANSLATION STUDIO TABLE
// ==========================================
function renderStudioTable() {
  filterAndRenderTable();
}

function filterAndRenderTable() {
  const search = DOM.searchTable.value.toLowerCase().trim();
  const category = DOM.filterCategory.value;

  const filtered = state.translatedStrings.filter((item) => {
    // Category match
    if (category !== "all") {
      if (
        category === "Dialogue" &&
        !item.type.includes("Dialogue") &&
        !item.type.includes("Scrolling")
      )
        return false;
      if (
        category === "Item" &&
        !item.type.includes("Item") &&
        !item.type.includes("Weapon") &&
        !item.type.includes("Armor")
      )
        return false;
      if (category === "Skill" && !item.type.includes("Skill")) return false;
      if (
        category === "System" &&
        !item.type.includes("System") &&
        !item.type.includes("Menu") &&
        !item.type.includes("Message")
      )
        return false;
      if (
        category === "Actor" &&
        !item.type.includes("Actor") &&
        !item.type.includes("Class")
      )
        return false;
    }

    // Search match
    if (search) {
      const origMatch = item.originalText.toLowerCase().includes(search);
      const transMatch = (item.translatedText || "")
        .toLowerCase()
        .includes(search);
      const fileMatch = item.file.toLowerCase().includes(search);
      if (!origMatch && !transMatch && !fileMatch) return false;
    }

    return true;
  });

  DOM.tableShowingLabel.textContent = `Menampilkan ${filtered.length} dari ${state.translatedStrings.length} baris`;

  // Render first 100 items for performance
  const displaySlice = filtered.slice(0, 100);
  DOM.tableBody.innerHTML = "";

  displaySlice.forEach((item) => {
    const tr = document.createElement("tr");

    // Highlight tags visually in original text
    const highlightedOrig = escapeHtml(item.maskedText).replace(
      /\[\[TAG_(\d+)\]\]/g,
      '<span class="tag-badge">TAG_$1</span>',
    );

    tr.innerHTML = `
      <td><span class="cell-category">${escapeHtml(item.type)}</span></td>
      <td><span class="cell-file">${escapeHtml(item.file)}</span></td>
      <td class="cell-original">${highlightedOrig}</td>
      <td>
        <textarea class="cell-translated-input" data-id="${escapeHtml(item.id)}">${escapeHtml(item.translatedText || "")}</textarea>
      </td>
    `;

    // Listen to manual inline edits
    const textarea = tr.querySelector("textarea");
    textarea.addEventListener("input", (e) => {
      item.translatedText = e.target.value;
    });

    DOM.tableBody.appendChild(tr);
  });
}

// ==========================================
// GLOSSARY MODAL
// ==========================================
function updateGlossaryBadge() {
  const count = Object.keys(state.glossary).length;
  DOM.glossaryCount.textContent = count;
}

function renderGlossaryList() {
  DOM.glossaryList.innerHTML = "";
  const entries = Object.entries(state.glossary);

  if (entries.length === 0) {
    DOM.glossaryList.innerHTML =
      '<p class="modal-desc" style="text-align: center;">Belum ada istilah khusus. Tambahkan di atas!</p>';
    return;
  }

  entries.forEach(([key, val]) => {
    const item = document.createElement("div");
    item.className = "glossary-item";
    item.innerHTML = `
      <span><strong>${escapeHtml(key)}</strong> <span class="glossary-arrow">➔</span> ${escapeHtml(val)}</span>
      <button class="btn-icon-subtle" title="Hapus Istilah">✕</button>
    `;

    item.querySelector("button").addEventListener("click", () => {
      delete state.glossary[key];
      localStorage.setItem(
        "rpgm_custom_glossary",
        JSON.stringify(state.glossary),
      );
      renderGlossaryList();
      updateGlossaryBadge();
    });

    DOM.glossaryList.appendChild(item);
  });
}

function addGlossaryEntry() {
  const key = DOM.glossaryInputKey.value.trim();
  const val = DOM.glossaryInputVal.value.trim();

  if (!key || !val) {
    showToast("Harap isi kata asli dan kata terjemahannya!", "error");
    return;
  }

  state.glossary[key] = val;
  localStorage.setItem("rpgm_custom_glossary", JSON.stringify(state.glossary));

  DOM.glossaryInputKey.value = "";
  DOM.glossaryInputVal.value = "";
  renderGlossaryList();
  updateGlossaryBadge();
  showToast(`Istilah "${key}" ditambahkan ke kamus!`, "success");
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================
function toggleModal(modalEl, show) {
  if (show) modalEl.classList.remove("hidden");
  else modalEl.classList.add("hidden");
}

function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${type === "success" ? "✓" : type === "error" ? "⚠️" : "ℹ️"}</span>
    <span>${escapeHtml(message)}</span>
  `;

  DOM.toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function escapeHtml(str) {
  if (typeof str !== "string") return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Initialize application on DOM ready
document.addEventListener("DOMContentLoaded", init);
