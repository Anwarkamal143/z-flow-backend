import {
  BadRequestException,
  ForbiddenException,
  InternalServerException,
} from "@/utils/catch-errors";
import { Polar } from "@polar-sh/sdk";
import { PolarService } from "./polar.service";

export class CustomerService extends PolarService {
  /**
   *
   */

  public async getPolarCustomerById(customerId: string) {
    if (!customerId) {
      return {
        error: new BadRequestException("Customer ID is required."),
        data: null,
      };
    }
    try {
      const customer = await this.customers.get({ id: customerId });

      return { data: customer, error: null };
    } catch (error) {
      return {
        error: new InternalServerException(
          "Error retrieving Polar customer: " + (error as Error).message,
        ),
        data: null,
      };
    }
  }
  public async getPolarCustomerStateById(customerId: string) {
    if (!customerId) {
      return {
        error: new BadRequestException("Customer ID is required."),
        data: null,
      };
    }
    try {
      const customer = await this.customers.getState({ id: customerId });
      return { data: customer, error: null };
    } catch (error) {
      return {
        error: new InternalServerException(
          "Error retrieving Customer Subscriptions: " +
            (error as Error).message,
        ),
        data: null,
      };
    }
  }

  public async createPolarCustomerWithExternalId(
    data: Parameters<Polar["customers"]["create"]>[0],
    externalId: string,
  ) {
    if (!externalId) {
      return {
        error: new BadRequestException(
          "External ID is required to create a Polar customer.",
        ),
        data: null,
      };
    }
    try {
      const customer = await this.customers.create({
        ...data,
        externalId,
      });
      return { data: customer, error: null };
    } catch (error) {
      return {
        error: new InternalServerException(
          "Error creating Polar customer: " + (error as Error).message,
        ),
        data: null,
      };
    }
  }
  public async createPolarCustomer(
    data: Parameters<Polar["customers"]["create"]>[0],
  ) {
    try {
      const customer = await this.customers.create({
        ...data,
      });
      return { data: customer, error: null };
    } catch (error) {
      return {
        error: new InternalServerException(
          "Error creating Polar customer: " + (error as Error).message,
        ),
        data: null,
      };
    }
  }
  public async getPolarCustomerByExternalId(externalId: string) {
    if (!externalId) {
      return {
        error: new BadRequestException("External ID is required."),
        data: null,
      };
    }
    try {
      const customer = await this.customers.getExternal({ externalId });
      return { data: customer, error: null };
    } catch (error) {
      return {
        error: new InternalServerException("Error getting Polar customer: "),
        data: null,
      };
    }
  }
  public async getPolarCustomerActiveSubscription(id: string) {
    if (!id) {
      return {
        error: new BadRequestException("External ID is required."),
        data: null,
      };
    }
    try {
      const customer = await this.customers.getState({ id });
      if (
        !customer.activeSubscriptions ||
        customer.activeSubscriptions?.length == 0
      ) {
        return {
          error: new ForbiddenException("Active subscription required."),
          data: null,
        };
      }
      return { data: customer, error: null };
    } catch (error) {
      return {
        error: new InternalServerException(
          "Error getting Active Subscription: ",
        ),
        data: null,
      };
    }
  }
  public async updatePolarCustomer(
    data: Parameters<Polar["customers"]["updateExternal"]>[0],
    externalId: string,
  ) {
    if (!externalId) {
      return {
        error: new BadRequestException(
          "External ID is required to update a Polar customer.",
        ),
        data: null,
      };
    }
    try {
      const customer = await this.customers.updateExternal({
        ...data,
        externalId,
      });
      return { data: customer, error: null };
    } catch (error) {
      return {
        error: new InternalServerException(
          "Error updating Polar customer: " + (error as Error).message,
        ),
        data: null,
      };
    }
  }
}

export const customerService = new CustomerService();
