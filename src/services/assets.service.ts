import { eq } from "@/db";

import { HTTPSTATUS } from "@/config/http.config";
import { assets } from "@/db/tables";
import { IAsset, InsertAsset, InsertAssetSchema } from "@/schema/asset";
import { formatZodError } from "@/utils";
import { ValidationException } from "@/utils/catch-errors";
import { BaseService } from "./base.service";

export class AseetService extends BaseService<
  typeof assets,
  InsertAsset,
  IAsset
> {
  constructor() {
    super(assets);
  }

  async listPaginatedAseets(params: typeof this._types.PaginatedParams) {
    const { mode, sort = "desc", ...rest } = params;
    if (mode === "offset") {
      return await this.paginateOffset({
        ...rest,
        sort,
      });
    }

    return await this.paginateCursor({
      ...rest,
      sort,
      cursorColumn: (table) => table.id,
    });
  }

  async softDeleteAccountById(accountId: string) {
    return this.softDelete((table) => eq(table.id, accountId), {
      deleted_at: new Date(),
    });
  }

  async createAsset(data: InsertAsset) {
    const result = InsertAssetSchema.safeParse(data);
    if (result.error) {
      const errors = formatZodError(result.error);

      return {
        error: new ValidationException("Validatoin error", errors),
        data: null,
        status: HTTPSTATUS.BAD_REQUEST,
      };
    }

    return await this.create(data);
  }
}
export const assetsService = new AseetService();
