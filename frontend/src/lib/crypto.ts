/**
 * パスワードの暗号化/復号化ユーティリティ
 * Web Crypto API を使用してAES-GCMで暗号化
 * 暗号化キーはIndexedDBに保存（デバイス固有）
 */

const DB_NAME = 'ftp-webui-keys';
const STORE_NAME = 'encryption-keys';
const KEY_ID = 'master-key';

// IndexedDBから暗号化キーを取得または生成
async function getOrCreateKey(): Promise<CryptoKey> {
  const db = await openDB();
  
  // 既存のキーを取得
  const existingKey = await getKeyFromDB(db);
  if (existingKey) {
    return existingKey;
  }
  
  // 新しいキーを生成
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true, // extractable
    ['encrypt', 'decrypt']
  );
  
  // キーをエクスポートして保存
  const exportedKey = await crypto.subtle.exportKey('raw', key);
  await saveKeyToDB(db, exportedKey);
  
  return key;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

function getKeyFromDB(db: IDBDatabase): Promise<CryptoKey | null> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(KEY_ID);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = async () => {
      if (request.result) {
        try {
          const key = await crypto.subtle.importKey(
            'raw',
            request.result.key,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
          );
          resolve(key);
        } catch {
          resolve(null);
        }
      } else {
        resolve(null);
      }
    };
  });
}

function saveKeyToDB(db: IDBDatabase, keyData: ArrayBuffer): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put({ id: KEY_ID, key: keyData });
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// パスワードを暗号化
export async function encryptPassword(password: string): Promise<string> {
  if (!password) return '';
  
  try {
    const key = await getOrCreateKey();
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    
    // ランダムなIVを生成
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );
    
    // IV + 暗号化データをBase64エンコード
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Encryption failed:', error);
    return '';
  }
}

// パスワードを復号化
export async function decryptPassword(encryptedPassword: string): Promise<string> {
  if (!encryptedPassword) return '';
  
  try {
    const key = await getOrCreateKey();
    
    // Base64デコード
    const combined = Uint8Array.from(atob(encryptedPassword), c => c.charCodeAt(0));
    
    // IV と暗号化データを分離
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    return '';
  }
}

