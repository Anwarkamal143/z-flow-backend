import { eq, UserAddressType } from "@/db";

import { userAddresses } from "@/db/tables";
import { ErrorCode } from "@/enums/error-code.enum";
import { InsertAddress, SelectAddress } from "@/schema/address";
import { BadRequestException } from "@/utils/catch-errors";
import { BaseService } from "./base.service";

export class AddressService extends BaseService<
  typeof userAddresses,
  InsertAddress,
  SelectAddress
> {
  constructor() {
    super(userAddresses);
  }

  async upsertUserAddress(address: InsertAddress, userId: string) {
    if (!userId) {
      return {
        error: new BadRequestException(
          "User ID is required to Add Or Update address"
        ),
        data: null,
      };
    }
    return this.upsert(
      [
        {
          ...address,
          type: UserAddressType.BILLING,
        },
      ],
      [userAddresses.userId],
      { updated_at: new Date(), ...address }
    );
  }

  async listPaginatedAddresses(params: typeof this._types.PaginatedParams) {
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

  async softDeleteAddressById(accountId: string) {
    return this.softDelete((table) => eq(table.id, accountId), {
      deleted_at: new Date(),
    });
  }

  public async createAddress(address: InsertAddress, userId: string) {
    if (!userId) {
      return {
        error: new BadRequestException(
          "User ID is required to create an address."
        ),
        data: null,
      };
    }
    return await this.create({
      ...address,
      userId,
    });
  }

  public async getAddressByUserId(userId: string) {
    if (!userId) {
      return {
        data: null,
        error: new BadRequestException("User ID is required for the address", {
          errorCode: ErrorCode.VALIDATION_ERROR,
        }),
      };
    }
    return await this.findOne((fields) => eq(fields.userId, userId));
  }
}
export const addressService = new AddressService();
