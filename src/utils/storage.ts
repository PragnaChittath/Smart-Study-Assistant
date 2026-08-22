import { StudySet } from '../types';

const DB_NAME = 'SmartStudyAssistantDB';
const DB_VERSION = 1;
const STORE_NAME = 'study_sets';
const LOCAL_STORAGE_KEY = 'smart_study_assistant_sets_v1';

// Open or initialize IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB is not supported in this environment.'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to open IndexedDB.'));
    };
  });
}

// Compress / downsample an image dataURL for safe thumbnail storage
export async function createThumbnailDataUrl(
  dataUrl: string,
  maxWidth = 320,
  maxHeight = 320,
  quality = 0.7
): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) {
    return dataUrl;
  }

  // If already small (< 40KB), return as is
  if (dataUrl.length < 40000) {
    return dataUrl;
  }

  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (!width || !height) {
          return resolve(dataUrl);
        }

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(dataUrl);

        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    } catch {
      resolve(dataUrl);
    }
  });
}

// Sanitize a study set to strip or compress massive base64 payloads for localStorage
function sanitizeForLocalStorage(set: StudySet): StudySet {
  const sanitized = { ...set };

  // If previewImage is a massive base64 string (> 50KB), strip or keep it minimal
  if (sanitized.previewImage && sanitized.previewImage.length > 50000) {
    sanitized.previewImage = undefined;
  }

  if (sanitized.previewImages && Array.isArray(sanitized.previewImages)) {
    sanitized.previewImages = sanitized.previewImages
      .filter((img) => img && img.length < 50000)
      .slice(0, 3);
  }

  return sanitized;
}

// Save all sets to IndexedDB
export async function saveSetsToIndexedDB(sets: StudySet[]): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    // Clear and re-populate
    await new Promise<void>((resolve, reject) => {
      const clearReq = store.clear();
      clearReq.onsuccess = () => resolve();
      clearReq.onerror = () => reject(clearReq.error);
    });

    for (const set of sets) {
      store.put(set);
    }

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    // Non-fatal, fallback to localStorage
    console.warn('IndexedDB save notice:', err);
  }
}

// Load all sets from IndexedDB
export async function loadSetsFromIndexedDB(): Promise<StudySet[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        resolve(req.result || []);
      };

      req.onerror = () => {
        reject(req.error);
      };
    });
  } catch {
    return [];
  }
}

// Safe save to LocalStorage with fallback pruning on QuotaExceededError
export function safeSaveToLocalStorage(sets: StudySet[]): void {
  try {
    const sanitized = sets.map(sanitizeForLocalStorage);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sanitized));
  } catch (e: any) {
    // Quota exceeded: try aggressive minimization (keep latest 10 sets without images)
    try {
      const minimalSets = sets.slice(0, 10).map((set) => ({
        ...set,
        previewImage: undefined,
        previewImages: undefined,
        rawTextSnippet: undefined,
      }));
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(minimalSets));
    } catch {
      // If still failing, keep only latest 3 sets
      try {
        const ultraMinimal = sets.slice(0, 3).map((set) => ({
          ...set,
          previewImage: undefined,
          previewImages: undefined,
          rawTextSnippet: undefined,
        }));
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(ultraMinimal));
      } catch {
        // Storage full: IndexedDB handles persistent storage
      }
    }
  }
}

// Safe load from LocalStorage
export function safeLoadFromLocalStorage(): StudySet[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
