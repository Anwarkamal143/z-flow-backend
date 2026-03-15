import { APP_CONFIG } from "@/config/app.config";
import {
  BadRequestException,
  InternalServerException,
} from "@/utils/catch-errors";
import { PolarService } from "./polar.service";

export class CheckoutService extends PolarService {
  /**
   *
   */

  public async getCheckoutForCustomer(
    products: string[],
    userId: string,
    name: string | null,
    email: string | null
  ) {
    if (!userId) {
      return {
        error: new BadRequestException("User ID is required."),
        data: null,
      };
    }
    if (!name) {
      return {
        error: new BadRequestException("Customer Name is required."),
        data: null,
      };
    }
    if (!email) {
      return {
        error: new BadRequestException("Customer Email is required."),
        data: null,
      };
    }

    try {
      const checkout = await this.checkouts.create({
        products,
        customerName: name,
        customerEmail: email,
        externalCustomerId: userId,
        successUrl: APP_CONFIG.APP_URL!, // user redirected after payment
        returnUrl: APP_CONFIG.APP_URL!,
      });
      return { data: checkout, error: null };
    } catch (error) {
      return {
        error: new InternalServerException(
          "Error creating checkout session: " + (error as Error).message
        ),
        data: null,
      };
    }
  }
}

export const checkoutService = new CheckoutService();
