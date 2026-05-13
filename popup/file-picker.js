'use strict';

const statusEl = document.getElementById('status');
const fileInput = document.getElementById('file-input');
const params = new URLSearchParams(window.location.search);
const target = params.get('target') === 'resume' ? 'resume' : 'profile';
const RESUME_IMPORT_PENDING_KEY = 'profileResumeImportPending';
const RESUME_FILE_DB_NAME = 'workaholicResumeFiles';
const RESUME_FILE_STORE = 'files';

function setStatus(msg, type) {
  statusEl.textContent = msg;
  statusEl.className = type || '';
}

function openResumeFileDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(RESUME_FILE_DB_NAME, 1);
    request.onerror = () => reject(request.error || new Error('Falha ao abrir o banco de curriculos.'));
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(RESUME_FILE_STORE)) {
        db.createObjectStore(RESUME_FILE_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

async function storeResumeFileRecord(file) {
  if (!file.name.toLowerCase().endsWith('.pdf')) return null;

  const db = await openResumeFileDb();
  const fileId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const arrayBuffer = await file.arrayBuffer();

  await new Promise((resolve, reject) => {
    const tx = db.transaction(RESUME_FILE_STORE, 'readwrite');
    tx.objectStore(RESUME_FILE_STORE).put({
      filename: file.name,
      arrayBuffer,
      storedAt: Date.now(),
    }, fileId);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error || new Error('Falha ao salvar o PDF temporariamente.'));
    };
  });

  return fileId;
}

async function extractText(file) {
  const name = file.name.toLowerCase();

  if (name.endsWith('.pdf')) {
    if (typeof pdfjsLib !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = '../libs/pdf.worker.min.js';
    }
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pages = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      pages.push(content.items.map((item) => item.str || '').join(' '));
    }
    return pages.join('\n');
  }

  if (name.endsWith('.docx')) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  }

  throw new Error('Formato não suportado. Use PDF ou DOCX.');
}

fileInput.addEventListener('change', async () => {
  const file = fileInput.files?.[0];
  if (!file) return;

  setStatus('Processando…');

  try {
    const text = await extractText(file);
    const payload = {
      text,
      filename: file.name,
      target,
      ts: Date.now(),
    };

    const fileId = await storeResumeFileRecord(file);
    if (fileId) {
      payload.fileId = fileId;
    }

    await browser.storage.local.set({
      [RESUME_IMPORT_PENDING_KEY]: payload,
    });
    setStatus('✓ Concluído! Pode fechar esta janela.', 'ok');
    setTimeout(() => window.close(), 1200);
  } catch (err) {
    setStatus(`Erro: ${err.message}`, 'err');
  }
});
