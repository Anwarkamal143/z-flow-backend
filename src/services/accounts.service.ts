import { AccountType, and, eq, IProviderType, Provider } from "@/db";

import { accounts } from "@/db/tables";
import { InsertAccount, SelectAccount } from "@/schema/account";
import { BaseService, IPaginatedParams } from "./base.service";

export class AccountService extends BaseService<
  typeof accounts,
  InsertAccount,
  SelectAccount
> {
  constructor() {
    super(accounts);
  }

  async upsertGithubAccount(userId: string, githubId: string) {
    return this.upsert(
      [
        {
          userId: userId,
          provider: "github",
          provider_account_id: githubId,
          type: AccountType.oauth,
        },
      ],
      [accounts.userId, accounts.provider],
      { updated_at: new Date() }
    );
  }

  async listPaginatedAccounts(params: IPaginatedParams) {
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

  public async createAccount(userId: string) {
    return await this.create({
      userId: userId,
      type: AccountType.email,
      provider: Provider.email,
    });
  }

  public async createAccountViaGithub(userId: string, githubId: string) {
    return await this.create({
      userId: userId,
      provider: Provider.github,
      provider_account_id: githubId,
      type: AccountType.oauth,
    });
  }
  public async createAccountViaGoogle(userId: string, googleId: string) {
    return await this.create({
      userId: userId,
      provider: Provider.google,
      provider_account_id: googleId,
      type: AccountType.oauth,
    });
  }
  public async getAccountByUserId(userId: string) {
    return await this.findOne((table) => eq(table.userId, userId));
  }
  public async getAccountByProviderId(
    providerId: string,
    providerType: IProviderType
  ) {
    return await this.findOne((table) =>
      and(
        eq(table.provider_account_id, providerId),
        eq(table.provider, providerType)
      )
    );
  }
}
export const accountService = new AccountService();
