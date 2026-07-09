/**
 * Simple Base64 "encryption" as requested.
 * In a real production app, use AES or similar strong encryption.
 */
export const encryptData = (data: any): string => {
  const jsonString = JSON.stringify(data);
  return btoa(unescape(encodeURIComponent(jsonString)));
};

export const decryptData = (encrypted: string): any => {
  try {
    if (!encrypted || encrypted.trim() === "") return null;
    const decoded = decodeURIComponent(escape(atob(encrypted)));
    if (!decoded || decoded.trim() === "") return null;
    return JSON.parse(decoded);
  } catch (e) {
    console.error("Decryption failed", e);
    return null;
  }
};
