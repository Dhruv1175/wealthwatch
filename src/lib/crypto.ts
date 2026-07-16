import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

const getEncryptionKey = (): Buffer => {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length !== 32) {
    throw new Error('CRITICAL: ENCRYPTION_KEY must be a 32-character string in environment variables.');
  }
  return Buffer.from(key, 'utf8');
};

export function encryptField(text: string | null | undefined): { iv: string; authTag: string; ciphertext: string } | null {
  if (!text) return null;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  
  let ciphertext = cipher.update(text, 'utf8', 'hex');
  ciphertext += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  
  return {
    iv: iv.toString('hex'),
    authTag,
    ciphertext
  };
}

export function decryptField(ciphertext: string | null | undefined, iv: string | null | undefined, authTag: string | null | undefined): string | null {
  if (!ciphertext || !iv || !authTag) return ciphertext || null;
  const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  
  let cleartext = decipher.update(ciphertext, 'hex', 'utf8');
  cleartext += decipher.final('utf8');
  
  return cleartext;
}
