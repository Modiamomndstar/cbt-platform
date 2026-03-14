/**
 * Secure Local Storage Utility
 * 
 * Provides obfuscated storage for sensitive exam data to prevent basic
 * tampering by students (e.g., trying to modify their remaining time or answers
 * directly in Chrome DevTools).
 */

const SALT = "cbt-platform-secure-salt-v1";

// Simple obfuscation (Not true encryption, but sufficient to deter 99% of students from modifying JSON in localStorage)
const obfuscate = (text: string): string => {
  try {
    // 1. Encode to base64
    const b64 = btoa(encodeURIComponent(text));
    // 2. Reverse the string
    return b64.split('').reverse().join('');
  } catch (e) {
    console.error('Storage obfuscation error', e);
    return text;
  }
};

const deobfuscate = (obfText: string): string => {
  try {
    // 1. Reverse the string back
    const b64 = obfText.split('').reverse().join('');
    // 2. Decode base64
    return decodeURIComponent(atob(b64));
  } catch (e) {
    console.warn('Storage deobfuscation error (Possible tampering)', e);
    return "";
  }
};

/**
 * Saves an object securely to localStorage
 */
export const secureSet = (key: string, data: any): void => {
  try {
    const payload = JSON.stringify({
      _timestamp: new Date().getTime(),
      data
    });
    
    // Mix the key with salt so the localStorage key isn't obvious
    const secureKey = btoa(`${key}-${SALT}`);
    localStorage.setItem(secureKey, obfuscate(payload));
  } catch (err) {
    console.error('Error saving secure storage', err);
  }
};

/**
 * Retrieves and deserializes a secure object from localStorage
 */
export const secureGet = <T>(key: string): T | null => {
  try {
    const secureKey = btoa(`${key}-${SALT}`);
    const obfData = localStorage.getItem(secureKey);
    
    if (!obfData) return null;
    
    const jsonStr = deobfuscate(obfData);
    if (!jsonStr) return null;
    
    const payload = JSON.parse(jsonStr);
    return payload.data as T;
  } catch (err) {
    console.warn(`Error reading secure storage for ${key}`, err);
    return null;
  }
};

/**
 * Removes a secure object from localStorage
 */
export const secureRemove = (key: string): void => {
  try {
    const secureKey = btoa(`${key}-${SALT}`);
    localStorage.removeItem(secureKey);
  } catch (err) {
    console.error('Error removing secure storage', err);
  }
};
