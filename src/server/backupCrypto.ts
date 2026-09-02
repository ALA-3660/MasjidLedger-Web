import crypto from 'crypto';
import zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

// 256-bit encryption key validation from environment variable
export function getEncryptionKey(): Buffer {
  const secret = process.env.BACKUP_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error('BACKUP_ENCRYPTION_KEY environment variable is missing. Secure backup is blocked.');
  }
  // Derive a robust 32-byte key using SHA-256 of the secret string
  return crypto.createHash('sha256').update(secret).digest();
}

export interface EncryptedArtifact {
  encryptedData: string; // base64
  iv: string; // base64 (12 bytes for GCM)
  authTag: string; // base64 (16 bytes for GCM)
  checksum: string; // SHA-256 hex
  metadata: {
    backupId: string;
    mosqueId: string;
    schemaVersion: string;
    applicationVersion: string;
    backupType: string;
    createdAt: string;
    createdBy: string;
    encryptionAlgorithm: string;
    compressionAlgorithm: string;
    checksumAlgorithm: string;
  };
}

export async function encryptBackupPayload(
  payloadObj: any,
  metadata: {
    backupId: string;
    mosqueId: string;
    schemaVersion: string;
    applicationVersion: string;
    backupType: string;
    createdBy: string;
  }
): Promise<{ rawArtifactJson: string; checksum: string }> {
  const key = getEncryptionKey();

  // 1. Serialize package
  const jsonStr = JSON.stringify(payloadObj);

  // 2. Compress via gzip
  const compressedBuf = await gzip(Buffer.from(jsonStr, 'utf-8'));

  // 3. Encrypt via AES-256-GCM
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  const encryptedBuf = Buffer.concat([cipher.update(compressedBuf), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const fullMetadata = {
    ...metadata,
    createdAt: new Date().toISOString(),
    encryptionAlgorithm: 'aes-256-gcm',
    compressionAlgorithm: 'gzip',
    checksumAlgorithm: 'sha256',
  };

  const artifact = {
    encryptedData: encryptedBuf.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    metadata: fullMetadata,
    checksum: '' // placeholder before checksum calculation
  };

  // 4. Compute SHA-256 checksum over the encrypted payload container (excluding checksum field)
  const checksumPayload = JSON.stringify({
    encryptedData: artifact.encryptedData,
    iv: artifact.iv,
    authTag: artifact.authTag,
    metadata: artifact.metadata
  });
  
  const checksum = crypto.createHash('sha256').update(checksumPayload).digest('hex');
  artifact.checksum = checksum;

  return {
    rawArtifactJson: JSON.stringify(artifact, null, 2),
    checksum
  };
}

export async function decryptAndVerifyBackupPayload(artifactJson: string): Promise<any> {
  const key = getEncryptionKey();

  let artifact: EncryptedArtifact;
  try {
    artifact = JSON.parse(artifactJson);
  } catch (err) {
    throw new Error('CORRUPTED_BACKUP: Invalid JSON structure.');
  }

  if (!artifact.encryptedData || !artifact.iv || !artifact.authTag || !artifact.checksum || !artifact.metadata) {
    throw new Error('INVALID_BACKUP_METADATA: Missing required artifact properties.');
  }

  // 1. Verify SHA-256 checksum
  const expectedChecksumPayload = JSON.stringify({
    encryptedData: artifact.encryptedData,
    iv: artifact.iv,
    authTag: artifact.authTag,
    metadata: artifact.metadata
  });
  const computedChecksum = crypto.createHash('sha256').update(expectedChecksumPayload).digest('hex');

  if (computedChecksum !== artifact.checksum) {
    throw new Error('CHECKSUM_MISMATCH: Backup file has been tampered with or corrupted.');
  }

  // 2. Decrypt AES-256-GCM
  let decryptedBuf: Buffer;
  try {
    const ivBuf = Buffer.from(artifact.iv, 'base64');
    const authTagBuf = Buffer.from(artifact.authTag, 'base64');
    const encryptedBuf = Buffer.from(artifact.encryptedData, 'base64');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, ivBuf);
    decipher.setAuthTag(authTagBuf);

    decryptedBuf = Buffer.concat([decipher.update(encryptedBuf), decipher.final()]);
  } catch (err: any) {
    throw new Error(`DECRYPTION_FAILED: Invalid encryption key or authentication tag mismatch. (${err.message})`);
  }

  // 3. Decompress gzip
  let jsonStr: string;
  try {
    const decompressedBuf = await gunzip(decryptedBuf);
    jsonStr = decompressedBuf.toString('utf-8');
  } catch (err: any) {
    throw new Error('DECOMPRESSION_FAILED: Failed to decompress backup payload.');
  }

  // 4. Parse JSON
  let payload: any;
  try {
    payload = JSON.parse(jsonStr);
  } catch (err) {
    throw new Error('INVALID_PAYLOAD_JSON: Decrypted data is not a valid JSON structure.');
  }

  return {
    payload,
    metadata: artifact.metadata
  };
}
