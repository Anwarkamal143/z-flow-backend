import { HTTPSTATUS } from "@/config/http.config";
import { eq, Provider, Role } from "@/db";
import { users } from "@/db/tables";
import { ErrorCode } from "@/enums/error-code.enum";
import { InsertUser, IUpdateUser, SelectUser } from "@/schema/user";
import {
  BadRequestException,
  InternalServerException,
} from "@/utils/catch-errors";
import { toUTC } from "@/utils/date-time";
import { cacheManager } from "@/utils/redis-cache/cache-manager";
import { AccountService } from "./accounts.service";
import { BaseService } from "./base.service";
type CreateUserInput = Pick<SelectUser, "email" | "name"> &
  Partial<Omit<SelectUser, "email" | "name">>;
export type UsersPaginationConfig = typeof userService._types.PaginationsConfig;
export class UserService extends BaseService<
  typeof users,
  InsertUser,
  SelectUser
> {
  constructor(private accountService = new AccountService()) {
    super(users);
  }

  async listAllPaginatedUsers(params: typeof this._types.PaginatedParams = {}) {
    const { mode, sort = "desc", ...rest } = params;
    if (mode == "cursor") {
      const resp = await this.paginateCursor({
        ...rest,
        sort,
        cursorColumn: (table) => table.id,
      });
      if (resp.data) {
        resp.data = resp.data.map((r) => ({ ...r, password: null }));
      }
      return resp;
    }

    const res = await this.paginateOffset({
      ...rest,
      sort,
    });
    if (res.data) {
      res.data = res.data.map((r) => ({ ...r, password: null }));
    }
    return res;
  }
  async listAllPaginatedUsersV2(params: UsersPaginationConfig) {
    const { mode } = params;
    if (mode == "cursor") {
      const resp = await this.paginationCursorRecords({
        ...params,
      });

      if (resp.data?.items) {
        resp.data.items = resp.data.items?.map((r) => ({
          ...r,
          password: null,
        }));
      }
      return resp;
    }

    const res = await this.paginationOffsetRecords({
      ...params,
    });
    if (res.data?.items) {
      res.data.items = res.data.items.map((r) => ({ ...r, password: null }));
    }
    return res;
  }
  async softDeleteUserById(accountId: string) {
    return this.softDelete((table) => eq(table.id, accountId), {
      deleted_at: new Date(),
    });
  }

  public async getUserByEmail(email: string, selectPassword = false) {
    if (!email) {
      return {
        data: null,
        error: new BadRequestException("Email is required", {
          errorCode: ErrorCode.VALIDATION_ERROR,
        }),
      };
    }
    const response = await this.findOne((fields) => eq(fields.email, email));
    const user = response.data;
    if (user) {
      return {
        data: {
          ...user,
          password: selectPassword ? user.password : undefined,
        },
        status: HTTPSTATUS.OK,
      };
    }
    return response;
  }

  public async getUserById(id?: string, excludePassword = true) {
    if (!id) {
      return {
        data: null,

        error: new BadRequestException("User Id is required", {
          errorCode: ErrorCode.VALIDATION_ERROR,
        }),
      };
    }

    const resOne = await this.findOne((fields) => eq(fields.id, id));
    if (resOne.data && excludePassword) {
      const { password, ...restData } = resOne.data;
      return { ...resOne, data: restData };
    }
    return resOne;
  }

  public async createUser(userData: CreateUserInput) {
    const { data: user } = await this.create(userData);
    if (!user) {
      return {
        data: null,
        error: new BadRequestException("User not created"),
      };
    }
    return {
      data: { ...user, password: undefined },
      status: HTTPSTATUS.CREATED,
    };
  }

  async createGoogleUserUseCase(googleUser: IGoogleUser) {
    try {
      let existingUser = await this.getUserByEmail(googleUser.email);
      let user = existingUser.data;
      if (!user) {
        const { data } = await this.createUser({
          email: googleUser.email,
          email_verified: toUTC(new Date(), false),
          name: googleUser.name?.toLowerCase(),
          image: googleUser.picture,
          role: Role.SUPER_ADMIN,
        });
        user = data;
      }
      // const user = existingUser.user;
      if (!user) {
        return {
          data: null,
          error: new BadRequestException("Failed to create Google user", {
            errorCode: ErrorCode.BAD_REQUEST,
          }),
        };
      }

      await this.accountService.createAccountViaGoogle(user.id, googleUser.sub);

      return { data: user, status: HTTPSTATUS.CREATED };
    } catch (error) {
      return {
        data: null,
        error: new InternalServerException("Failed to create Google user"),
      };
    }
  }

  async getAccountByGoogleIdUseCase(googleId: string) {
    return await this.accountService.getAccountByProviderId(
      googleId,
      Provider.google
    );
  }

  async updateUser(userId: string, updateData: IUpdateUser) {
    const { password, ...userData } = updateData;
    const { data, ...rest } = await this.update<IUpdateUser>(
      (fields) => eq(fields.id, userId),
      userData
    );
    await cacheManager.remove(`users`);
    return { ...rest, data: data?.[0] };
  }
}
export const userService = new UserService();
