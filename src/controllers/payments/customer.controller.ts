import { ErrorCode } from "@/enums/error-code.enum";
import { customerService } from "@/services/payments/customer.service";
import { userService } from "@/services/user.service";
import {
  InternalServerException,
  NotFoundException,
  UnauthenticatedException,
} from "@/utils/catch-errors";
import { SuccessResponse } from "@/utils/requestResponse";
import { Polar } from "@polar-sh/sdk";
import { FastifyReply, FastifyRequest } from "fastify";

class CustomerController {

  public async createPolarCustomer(
    req: FastifyRequest<{ Body: Parameters<Polar["customers"]["create"]>[0] }>,
    rep: FastifyReply
  ) {
    const customer = await customerService.createPolarCustomer(req.body);

    if (customer.error) {
      throw customer.error;
    }
    return SuccessResponse(rep, {
      data: { ...customer },
      status: "success",
      statusCode: 200,
      message: "Customer created successfully",
    });
  }
  public async createCheckoutPolarCustomer(
    req: FastifyRequest<{ Body: Parameters<Polar["customers"]["create"]>[0] }>,
    rep: FastifyReply
  ) {
    const user = req.user;
    if (!user) {
      throw new InternalServerException("User not authenticated", {
        errorCode: ErrorCode.AUTH_UNAUTHORIZED,
      });
    }

    const customer = await customerService.createPolarCustomerWithExternalId(
      req.body,
      user.id
    );
    if (customer.error) {
      throw customer.error;
    }
    return SuccessResponse(rep, {
      data: { ...customer },
      status: "success",
      statusCode: 200,
      message: "Customer created successfully",
    });
  }
  public async getPolarCustomer(req: FastifyRequest, rep: FastifyReply) {
    const user = req.user;
    if (!user) {
      throw new UnauthenticatedException("User not authenticated");
    }
    const { data } = await userService.getUserById(user.id);
    if (!data) {
      throw new NotFoundException("User not found");
    }
    if (!data.polar_customer_id) {
      throw new NotFoundException("Polar customer ID not found for user");
    }
    const customer = await customerService.getPolarCustomerStateById(
      data.polar_customer_id
    );
    if (customer.error) {
      throw customer.error;
    }
    return SuccessResponse(rep, {
      data: { ...customer.data },
      status: "success",
      statusCode: 200,
      message: "Customer retrieved successfully",
    });
  }
}

// Export a singleton instance
export default new CustomerController();
