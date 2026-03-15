import { APP_CONFIG } from "@/config/app.config";
import crypto from "crypto";
import { promisify } from "util";

export interface EncryptedData {
  ciphertext: string;
  iv: string;
  authTag: string;
}

export interface EncryptedDEK extends EncryptedData {
  salt: string;
  keyVersion: number;
}

export class EnvelopeEncryption {
  private readonly algorithm = "aes-256-gcm";
  private readonly keyLength = 32;
  private readonly ivLength = 12;
  private readonly saltLength = 16;
  private readonly pbkdf2Iterations = 210_000;

  constructor(
    private readonly masterPassphrase: string = APP_CONFIG.SECRETS_MASTER_KEY,
    private readonly pepper: string = APP_CONFIG.SECRETS_PEPPER,
  ) {}

  /* ------------------------ KEK ------------------------ */

  private async deriveKEK(salt: Buffer): Promise<Buffer> {
    return promisify(crypto.pbkdf2)(
      this.masterPassphrase + this.pepper,
      salt,
      this.pbkdf2Iterations,
      this.keyLength,
      "sha256",
    );
  }

  /* ------------------------ DEK ------------------------ */

  generateDEK(): Buffer {
    return crypto.randomBytes(this.keyLength);
  }

  /* -------------------- Encrypt DEK -------------------- */

  async encryptDEK(dek: Buffer, keyVersion = 1): Promise<EncryptedDEK> {
    const salt = crypto.randomBytes(this.saltLength);
    const iv = crypto.randomBytes(this.ivLength);

    const kek = await this.deriveKEK(salt);

    const cipher = crypto.createCipheriv(this.algorithm, kek, iv);
    const encrypted = Buffer.concat([cipher.update(dek), cipher.final()]);

    return {
      ciphertext: encrypted.toString("base64"),
      iv: iv.toString("base64"),
      authTag: cipher.getAuthTag().toString("base64"),
      salt: salt.toString("base64"),
      keyVersion,
    };
  }

  /* -------------------- Decrypt DEK -------------------- */

  async decryptDEK(encrypted: EncryptedDEK): Promise<Buffer> {
    const kek = await this.deriveKEK(Buffer.from(encrypted.salt, "base64"));

    const decipher = crypto.createDecipheriv(
      this.algorithm,
      kek,
      Buffer.from(encrypted.iv, "base64"),
    );

    decipher.setAuthTag(Buffer.from(encrypted.authTag, "base64"));

    return Buffer.concat([
      decipher.update(Buffer.from(encrypted.ciphertext, "base64")),
      decipher.final(),
    ]);
  }

  /* --------------- Encrypt User Secret ---------------- */

  encryptSecret(secret: string, dek: Buffer): EncryptedData {
    const iv = crypto.randomBytes(this.ivLength);

    const cipher = crypto.createCipheriv(this.algorithm, dek, iv);
    const encrypted = Buffer.concat([
      cipher.update(secret, "utf8"),
      cipher.final(),
    ]);

    return {
      ciphertext: encrypted.toString("base64"),
      iv: iv.toString("base64"),
      authTag: cipher.getAuthTag().toString("base64"),
    };
  }

  /* --------------- Decrypt User Secret ---------------- */

  decryptSecret(encrypted: EncryptedData, dek: Buffer): string {
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      dek,
      Buffer.from(encrypted.iv, "base64"),
    );

    decipher.setAuthTag(Buffer.from(encrypted.authTag, "base64"));

    return Buffer.concat([
      decipher.update(Buffer.from(encrypted.ciphertext, "base64")),
      decipher.final(),
    ]).toString("utf8");
  }
}
export default new EnvelopeEncryption();
