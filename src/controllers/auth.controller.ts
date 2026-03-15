import { APP_CONFIG } from "@/config/app.config";
import { HTTPSTATUS } from "@/config/http.config";
import { logger } from "@/config/logger";
import { AccountType, Provider, UserStatus } from "@/db";
import { ErrorCode } from "@/enums/error-code.enum";
import { IRegisterUser, RegisterUserSchema } from "@/schema/auth";
import { accountService } from "@/services/accounts.service";
import { userService } from "@/services/user.service";
import { compareValue, hashValue } from "@/utils/bcrypt";
import {
  BadRequestException,
  InternalServerException,
  UnauthenticatedException,
} from "@/utils/catch-errors";
import { resetCookies, setAccessTokenCookie, setCookies } from "@/utils/cookie";
import { decodeRefreshToken, verifyRefreshToken } from "@/utils/jwt";
import { deleteRefreshTokenWithJTI, getRefreshTokenByJTI } from "@/utils/redis";
import { SuccessResponse } from "@/utils/requestResponse";
import { FastifyReply, FastifyRequest } from "fastify";

export class AuthController {
  public signUp = async (
    req: FastifyRequest<{ Body: IRegisterUser }>,
    rep: FastifyReply
  ) => {
    try {
      const { password: pas, name, email } = req.body;
      const result = RegisterUserSchema.safeParse(req.body);

      if (!result.success) {
        throw new BadRequestException(result.error?.message, {
          errorCode: ErrorCode.VALIDATION_ERROR,
        });
      }

      const { data: existingUser } = await userService.getUserByEmail(
        result.data.email
      );
      if (existingUser) {
        throw new BadRequestException("Email already in use!", {
          errorCode: ErrorCode.AUTH_EMAIL_ALREADY_EXISTS,
        });
      }

      const hashedPassword = await hashValue(pas);
      const { data: user } = await userService.createUser({
        email,
        password: hashedPassword,
        name: name?.toLowerCase() as string,
      });

      if (!user?.id)
        throw new BadRequestException("Registration failed", {
          errorCode: ErrorCode.BAD_REQUEST,
        });

      await accountService.createAccount(user.id);
      const { accessToken, refreshToken } = await setCookies(rep, {
        id: user.id,
        providerType: Provider.email,
        role: user.role,
        provider: AccountType.email,
      });

      const { password, ...restUser } = user;
      return SuccessResponse(rep, {
        message: "Account created successfully!",
        data: { ...restUser, accessToken, refreshToken },
        statusCode: 201,
      });
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerException();
    }
  };

  public login = async (
    req: FastifyRequest<{ Body: { email: string; password: string } }>,
    rep: FastifyReply
  ) => {
    try {
      const { email, password } = req.body;
      const { data: user } = await userService.getUserByEmail(email, true);
      if (!user || !user.password) {
        throw new BadRequestException("Invalid credentials");
      }

      if (user.status === UserStatus.INACTIVE) {
        throw new BadRequestException("Your account is inactive", {
          errorCode: ErrorCode.ACCESS_UNAUTHORIZED,
        });
      }

      const isPasswordMatched = await compareValue(password, user.password);
      if (!isPasswordMatched) {
        throw new BadRequestException("Invalid credentials");
      }

      const { accessToken, refreshToken } = await setCookies(rep, {
        id: user.id,
        providerType: Provider.email,
        role: user.role,
        provider: AccountType.email,
      });

      const { password: psd, ...restUser } = user;
      return SuccessResponse(rep, {
        message: "Logged in successfully",
        data: { ...restUser, accessToken, refreshToken },
      });
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerException();
    }
  };

  public signOut = async (req: FastifyRequest, rep: FastifyReply) => {
    try {
      try {
        const refreshToken = req.cookies?.[APP_CONFIG.REFRESH_COOKIE_NAME];
        const data = decodeRefreshToken(refreshToken);
        if (data?.token_data?.jti) {
          await deleteRefreshTokenWithJTI(data.token_data.jti);
        }
      } catch (_) {}
      resetCookies(rep);
      return SuccessResponse(rep, { message: "Logged out" });
    } catch (error) {
      throw new InternalServerException("Failed to sign out", {
        errorCode: ErrorCode.INTERNAL_SERVER_ERROR,
      });
    }
  };

  public refreshTokens = async (req: FastifyRequest, rep: FastifyReply) => {
    try {
      const refreshToken = (req.cookies?.[APP_CONFIG.REFRESH_COOKIE_NAME] ||
        req.headers.refreshtoken) as string;
      if (!refreshToken)
        throw new UnauthenticatedException("You are not logged in");

      const tokenData = await verifyRefreshToken(refreshToken);
      if (!tokenData?.data?.token_data?.jti)
        throw new BadRequestException("Invalid refresh token", {
          errorCode: ErrorCode.AUTH_INVALID_TOKEN,
        });

      const { jti } = tokenData.data.token_data;
      const userData = tokenData.data.user;

      const storedRefreshToken = await getRefreshTokenByJTI(jti);
      if (!storedRefreshToken || storedRefreshToken.token !== refreshToken) {
        resetCookies(rep);
        await deleteRefreshTokenWithJTI(jti);

        throw new BadRequestException("Refresh token reuse detected", {
          errorCode: ErrorCode.AUTH_TOKEN_REUSED,
        });
      }

      const user = await userService.getUserById(userData.id);
      if (!user?.data?.id) {
        resetCookies(rep);
        await deleteRefreshTokenWithJTI(jti);
        return SuccessResponse(rep, {
          message: "Token is not refreshed",
          data: null,
          statusCode: HTTPSTATUS.UNAUTHORIZED,
        });
      }

      const { accessToken } = await setAccessTokenCookie(rep, { ...userData });
      logger.info({
        userId: userData.id,
        type: "REFRESH",
        status: "SUCCESS",
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      });

      return SuccessResponse(rep, {
        message: "Token refreshed",
        data: { accessToken, refreshToken },
      });
    } catch (error) {
      logger.error("Error refreshing token:", error);
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerException("Error refreshing token");
    }
  };
}

export default new AuthController();
