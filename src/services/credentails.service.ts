import { and, eq, ICredentialType, inArray } from "@/db";

import { BaseService, ITransaction } from "./base.service";

import { credentials } from "@/db/tables";
import { ErrorCode } from "@/enums/error-code.enum";
import {
  ICreateCredential,
  ICredentials,
  ICredentialsOutPut,
  InsertCredentialsSchema,
  IUpdateCredential,
  UpdateCredentialSchema,
} from "@/schema/credentials";
import { ULIDSchema } from "@/schema/helper";
import { formatZodError } from "@/utils";
import AppError from "@/utils/app-error";
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  ValidationException,
} from "@/utils/catch-errors";
import encryption from "@/utils/encryption";

export type CredentialPaginationConfig =
  typeof credentialService._types.PaginationsConfig;
export type CredentialSimplePaginationConfig =
  typeof credentialService._types.PaginatedParams;

export class Credentialservice extends BaseService<typeof credentials> {
  constructor() {
    super(credentials);
  }
  checkIfNeedToUpdate(
    newValue: Record<string, any>,
    existingValue: Record<string, any>,
  ) {
    const keys = Object.keys(newValue);
    for (const key of keys) {
      if (newValue[key] != existingValue[key]) {
        return true;
      }
    }
    return false;
  }
  async decryptSecretData(
    rows: ICredentials[],
  ): Promise<{ data: null | ICredentialsOutPut[]; error: null | AppError }> {
    // 1. Map each row to a decryption promise
    try {
      const decryptedData = await Promise.all(
        rows.map(async (r) => {
          const dek = await encryption.decryptDEK({
            ciphertext: r.dekCiphertext,
            iv: r.dekIv,
            authTag: r.dekAuthTag,
            salt: r.dekSalt,
            keyVersion: r.keyVersion,
          });
          const {
            id,
            type,
            updated_at,
            created_at,
            deleted_at,
            keyVersion,
            name,
            userId,
            metadata,
          } = r;
          return {
            id,
            type,
            updated_at,
            created_at,
            deleted_at,
            keyVersion,
            name,
            userId,
            metadata,
            value: encryption.decryptSecret(
              {
                ciphertext: r.secretCiphertext,
                iv: r.secretIv,
                authTag: r.secretAuthTag,
              },
              dek,
            ),
          };
        }),
      );

      // 2. Return decrypted credentials
      return {
        data: decryptedData as unknown as ICredentialsOutPut[],
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: new BadRequestException("Not able to decrypt"),
      };
    }
  }
  async encrypt(value: string) {
    try {
      // 1. Generate DEK
      const dek = encryption.generateDEK();

      // 2. Encrypt secret with DEK
      const encryptedSecret = encryption.encryptSecret(value, dek);

      // 3. Encrypt DEK with KEK
      const encryptedDEK = await encryption.encryptDEK(dek);
      return {
        secretCiphertext: encryptedSecret.ciphertext,
        secretIv: encryptedSecret.iv,
        secretAuthTag: encryptedSecret.authTag,

        dekCiphertext: encryptedDEK.ciphertext,
        dekIv: encryptedDEK.iv,
        dekAuthTag: encryptedDEK.authTag,
        dekSalt: encryptedDEK.salt,
        keyVersion: encryptedDEK.keyVersion,
      };
    } catch (error) {
      return null;
    }
  }
  /* ---------------- Resolve Secret ---------------- */

  /* -------- Resolve by Credential + node -------- */

  async resolveById(id: string) {
    if (!id) {
      return {
        error: new ValidationException("id is required", [
          { path: "id", message: "id is required" },
        ]),
        data: null,
      };
    }
    const res = await this.findOne((t) => eq(t.id, id));

    if (!res.data)
      return {
        error: new NotFoundException("credential not found"),
        data: null,
      };
    const resp = await this.decryptSecretData([res.data]);
    if (resp.error) {
      return { error: resp.error, data: null };
    }
    const data = resp.data?.[0];
    if (!data) {
      return {
        data: null,
        error: new BadRequestException("not a valid credential"),
      };
    }

    return {
      data,
      error: null,
    };
  }
  async resolveByIdUserId(id: string, userId: string) {
    if (!id) {
      return {
        error: new ValidationException("id is required", [
          { path: "id", message: "id is required" },
        ]),
        data: null,
      };
    }
    const res = await this.findOne((t) =>
      and(eq(t.id, id), eq(t.userId, userId)),
    );

    if (!res.data)
      return {
        error: new NotFoundException("credential not found"),
        data: null,
      };
    const resp = await this.decryptSecretData([res.data]);
    if (resp.error) {
      return { error: resp.error, data: null };
    }
    const data = resp.data?.[0];
    if (!data) {
      return {
        data: null,
        error: new BadRequestException("not a valid credential"),
      };
    }

    return {
      data,
      error: null,
    };
  }
  async getById(id: string, userId: string) {
    if (!id) {
      return {
        error: new ValidationException("id is required", [
          { path: "id", message: "id is required" },
        ]),
        data: null,
      };
    }
    if (!userId) {
      return {
        error: new ValidationException("userId is required", [
          { path: "userId", message: "userId is required" },
        ]),
        data: null,
      };
    }
    const res = await this.findOne((t) => eq(t.id, id));

    if (!res.data)
      return {
        error: new NotFoundException("credential not found"),
        data: null,
      };
    const resp = await this.decryptSecretData([res.data]);
    if (resp.error) {
      return resp;
    }
    const data = resp.data?.[0];
    if (!data) {
      return {
        data: null,
        error: new BadRequestException("not a valid credential"),
      };
    }
    return {
      data,
      error: null,
    };
  }
  async resolveByIds(ids?: string[]) {
    if (!ids || !ids.length) {
      return {
        error: new ValidationException("NodeIds are required", [
          { path: "nodeIds", message: "nodeId is required" },
        ]),
        data: null,
      };
    }
    const res = await this.findMany((t) => inArray(t.id, ids));

    if (!res.data)
      return { error: new NotFoundException("secret not found"), data: null };
    const resp = await this.decryptSecretData(res.data);
    if (resp.error) {
      return resp;
    }
    const data = resp.data;
    if (!data || !data.length) {
      return {
        data: null,
        error: new BadRequestException("not a valid credential"),
      };
    }
    return {
      data,
      error: null,
    };
  }

  /********************* CRUD  */
  /* ---------------- Create Secret ---------------- */

  async createCredentail(input: ICreateCredential, tx?: ITransaction) {
    const { userId, value, type, metadata, name } = input;
    const parseResult = InsertCredentialsSchema.safeParse(input);
    if (!parseResult.success) {
      return {
        error: new ValidationException(
          "Invalid input data",
          formatZodError(parseResult.error),
        ),
        data: null,
      };
    }

    const encryptedData = await this.encrypt(value);
    if (!encryptedData) {
      return {
        data: null,
        error: new BadRequestException("Credential encryption failed"),
      };
    }
    return this.create(
      {
        userId,
        metadata,
        name,
        ...encryptedData,
        type,
      },
      tx,
    );
  }

  async deleteById(id?: string, userId?: string, tx?: ITransaction) {
    if (!id) {
      return {
        data: null,
        error: new ValidationException("Id is missing", [
          {
            path: "id",
            message: "id is required",
          },
        ]),
      };
    }
    if (!userId) {
      return {
        data: null,
        error: new ValidationException("UserId is missing", [
          {
            path: "userId",
            message: "UserId is required",
          },
        ]),
      };
    }

    return await this.delete(
      (fields) => and(eq(fields.id, id), eq(fields.userId, userId)),
      tx,
    );
  }
  async updateCredentialData({
    input,
    tx,
  }: {
    input: IUpdateCredential;
    tx?: ITransaction;
  }) {
    if (!ULIDSchema("").safeParse(input.userId).success) {
      return {
        error: new UnauthorizedException(
          "You're not authorize to perform this action",
        ),
        data: null,
      };
    }
    const parseResult = UpdateCredentialSchema.safeParse(input);
    if (!parseResult.success) {
      return {
        error: new ValidationException(
          "Invalid input data",
          formatZodError(parseResult.error),
        ),
        data: null,
      };
    }
    const parseData = parseResult.data;
    const conditions = (t: typeof this.table) =>
      and(eq(t.id, parseData.id), eq(t.userId, parseData.userId as string));
    const credential = await this.findOne(conditions);
    if (!credential.data) {
      return credential;
    }
    const data = parseResult.data;
    let updateObj = { ...credential.data, ...data };
    if (data.value) {
      const enctyptedObj = await this.encrypt(data.value);
      if (!enctyptedObj) {
        return {
          data: null,
          error: new BadRequestException("Credential encryption failed"),
        };
      }
      const isNeedToUpdateSecret = this.checkIfNeedToUpdate(
        enctyptedObj,
        credential.data,
      );
      if (isNeedToUpdateSecret) {
        updateObj = {
          ...updateObj,
          ...enctyptedObj,
          keyVersion: (enctyptedObj.keyVersion || 0) + 1,
        };
      }
    }
    return await this.update(conditions, updateObj, tx);
  }

  async listAllPaginatedCredentials(
    params: CredentialPaginationConfig,
    excludeSecret = false,
  ) {
    const { mode } = params;
    if (mode == "offset") {
      const listresp = await this.paginationOffsetRecords({
        ...params,
      });
      if (listresp.data && !excludeSecret) {
        const newItems = await this.decryptSecretData(listresp.data.items);
        if (newItems.data) {
          listresp.data.items = newItems.data;
        }
      }
      return listresp;
    }
    const listresp = await this.paginationCursorRecords(params);
    if (listresp.data && !excludeSecret) {
      const newItems = await this.decryptSecretData(listresp.data.items);
      if (newItems.data) {
        listresp.data.items = newItems.data;
      }
    }
    return listresp;
  }
  public async getByType(type: ICredentialType, userId: string | null = null) {
    if (!type) {
      return {
        data: null,
        error: new BadRequestException("type is required", {
          errorCode: ErrorCode.VALIDATION_ERROR,
        }),
      };
    }
    if (!userId) {
      return {
        data: null,
        error: new BadRequestException("userId is required", {
          errorCode: ErrorCode.VALIDATION_ERROR,
        }),
      };
    }
    const resp = await this.findMany((fields) =>
      and(eq(fields.type, type), eq(fields.userId, userId)),
    );
    if (!resp.data || !resp.data?.length || resp.error) {
      return resp;
    }

    const items = await this.decryptSecretData(resp.data);
    if (!items) {
      return {
        data: null,
        error: new BadRequestException(
          "Request failed while decrypting values",
        ),
      };
    }
    return {
      data: items,
      error: null,
    };
  }
}

export const credentialService = new Credentialservice();
