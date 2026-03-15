import { checkoutService } from "@/services/payments/checkout.service";
import { userService } from "@/services/user.service";
import { BadRequestException, NotFoundException } from "@/utils/catch-errors";
import { FastifyReply, FastifyRequest } from "fastify";

class CheckoutController {
  public async getCustomerCheckout(
    req: FastifyRequest<{ Querystring: { products: string } }>,
    rep: FastifyReply
  ) {
    if (!req.query.products) {
      throw new BadRequestException("Product ID's are required.");
    }
    if (!req.customer) {
      throw new BadRequestException("No Customer Found.");
    }

    const user = req.user;
    const { data } = await userService.getUserById(user?.id);
    if (!data) {
      throw new NotFoundException("User not exist to create checkout session");
    }
    const products = req.query.products?.split(",");
    const checkout = await checkoutService.getCheckoutForCustomer(
      products,
      data.id,
      data.name,
      data.email
    );

    if (checkout.error) {
      throw checkout.error;
    }
    return rep.redirect(checkout.data.url);
  }
  public async getProSubscriptionCheckout(
    req: FastifyRequest,
    rep: FastifyReply
  ) {
    if (!req.customer) {
      throw new BadRequestException("No Customer Found.");
    }

    const user = req.user;
    const { data } = await userService.getUserById(user?.id);
    if (!data) {
      throw new NotFoundException("User not exist to create checkout session");
    }
    const products = ["0497e4b9-7ed0-4251-938d-235e7f842a99"];
    const checkout = await checkoutService.getCheckoutForCustomer(
      products,
      data.id,
      data.name,
      data.email
    );

    if (checkout.error) {
      throw checkout.error;
    }
    return rep.redirect(checkout.data.url);
  }
}

// Export a singleton instance
export default new CheckoutController();
