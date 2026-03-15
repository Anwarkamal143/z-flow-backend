import { APP_CONFIG } from "@/config/app.config";
import { userService, UsersPaginationConfig } from "@/services/user.service";
import { BadRequestException, NotFoundException } from "@/utils/catch-errors";
import { resetCookies } from "@/utils/cookie";
import { SuccessResponse } from "@/utils/requestResponse";
import { FastifyReply, FastifyRequest } from "fastify";

class UserController {
  /**
   * GET /users/me
   */
  public me = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    const accessToken = request.cookies?.[APP_CONFIG.COOKIE_NAME];
    const refreshToken = request.cookies?.[APP_CONFIG.REFRESH_COOKIE_NAME];
    const { data } = await userService.getUserById(user?.id);
    if (!data) {
      resetCookies(reply);
    }
    return SuccessResponse(reply, {
      data: data ? { ...data, accessToken, refreshToken } : null,
      message: data ? "User Found" : "User not found",
    });
  };

  /**
   * GET /users/:id
   */
  public findById = async (
    req: FastifyRequest<{ Params: { userId: string } }>,
    reply: FastifyReply
  ) => {
    const { userId: id } = req.params;
    if (!id) {
      throw new BadRequestException("User Id is required");
    }

    const { data, error } = await userService.getUserById(id);

    if (error) {
      throw new NotFoundException("User Not Found");
    }

    return SuccessResponse(reply, {
      data,
      message: "User Data",
    });
  };

  /**
   * GET /users
   */
  public findAll = async (
    req: FastifyRequest<{ Querystring: UsersPaginationConfig }>,
    reply: FastifyReply
  ) => {
    const validationResult = userService.validateQuery(req.query, {
      search: "name",
      sort: { column: "updated_at", direction: "desc" },
    });

    const result = await userService.listAllPaginatedUsersV2({
      ...validationResult,
    });
    if (result.error) {
      throw result.error;
    }
    return SuccessResponse(reply, {
      message: "users found",
      data: result.data,
    });
  };
}

export default new UserController();
