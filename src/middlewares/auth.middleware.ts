import { APP_CONFIG } from "@/config/app.config";
import { ErrorCode } from "@/enums/error-code.enum";

import { resetCookies, setCookies } from "@/utils/cookie";

import { Role } from "@/db";
import { userService } from "@/services/user.service";
import {
  UnauthenticatedException,
  UnauthorizedException,
} from "@/utils/catch-errors";
import { verifyAccessToken, verifyRefreshToken } from "@/utils/jwt";
import { FastifyReply, FastifyRequest } from "fastify";
// Helpers
const extractBearerToken = (request: FastifyRequest): string | undefined => {
  const header = request.headers.authorization;
  return typeof header === "string" && header.startsWith("Bearer ")
    ? header.split(" ")[1]
    : undefined;
};

export const getRequestTokens = (request: FastifyRequest) => ({
  accessToken:
    request.cookies?.[APP_CONFIG.COOKIE_NAME] || extractBearerToken(request),
  refreshToken: (request.cookies?.[APP_CONFIG.REFRESH_COOKIE_NAME] ||
    request.headers["refreshtoken"]) as string | undefined,
});

export class AuthMiddleware {
  // --------- AUTH REQUIRED ----------
  isAuthenticated = async (req: FastifyRequest, reply: FastifyReply) => {
    const { accessToken, refreshToken } = getRequestTokens(req);
    if (!accessToken || !refreshToken) {
      resetCookies(reply);
      throw new UnauthenticatedException("Not authenticated");
    }

    const tokenData = await verifyAccessToken(accessToken);

    if (tokenData.error) {
      resetCookies(reply);
      throw tokenData.error;
    }

    const isExpired = tokenData.isExpired;
    const finalTokenData = isExpired
      ? await verifyRefreshToken(refreshToken)
      : tokenData;

    if (!finalTokenData?.data?.user) {
      resetCookies(reply);
      throw new UnauthenticatedException("Invalid or expired token");
    }
    // const { data } = await this.userService.getUserById(
    //   finalTokenData.data.user.id,
    //   true
    // );
    // if (!data) {
    //   resetCookies(reply);
    //   return reply.status(401).redirect(`${APP_CONFIG.APP_URL}/login`);
    // }
    req.user = finalTokenData.data.user;

    if (isExpired) {
      req.tokenData = finalTokenData.data.user;
      await setCookies(reply, finalTokenData.data.user);
    }
  };

  // ---------- OPTIONAL AUTH ----------
  loggedInUser = async (req: FastifyRequest, reply: FastifyReply) => {
    const { accessToken, refreshToken } = getRequestTokens(req);

    if (!accessToken && !refreshToken) return;

    const { data: accessData, isExpired } =
      await verifyAccessToken(accessToken);

    if (isExpired) {
      const { data: refreshData } = await verifyRefreshToken(refreshToken);

      if (!refreshData?.user) {
        resetCookies(reply);
        return;
      }

      await setCookies(reply, refreshData.user);
      req.user = refreshData.user;
      return;
    }

    if (accessData?.user) req.user = accessData.user;
  };

  // ---------- API KEY PROTECTION ----------
  apiProtected = async (request: FastifyRequest) => {
    if (!request.headers["x-api-key"]) {
      throw new UnauthorizedException("Please provide an API key.");
    }
  };

  // ---------- ROLE BASED PROTECTION ----------
  restrictTo = (...roles: Role[]) => {
    return async (request: FastifyRequest) => {
      if (!request.user?.role || !roles.includes(request.user?.role as Role)) {
        throw new UnauthorizedException("You do not have permission");
      }
    };
  };

  // ---------- REFRESH IF NEEDED ----------
  refreshIfNeeded = async (request: FastifyRequest, reply: FastifyReply) => {
    const accessToken = request.cookies?.[APP_CONFIG.COOKIE_NAME];
    const refreshToken = request.cookies?.[APP_CONFIG.REFRESH_COOKIE_NAME];

    if (!accessToken || !refreshToken) {
      throw new UnauthorizedException("Not authenticated", {
        errorCode: ErrorCode.AUTH_INVALID_TOKEN,
      });
    }

    const accessPayload = await verifyAccessToken(accessToken);

    if (accessPayload.data && !accessPayload.isExpired) {
      request.user = accessPayload.data.user;
      return;
    }

    if (accessPayload.isExpired) {
      const refreshPayload = await verifyRefreshToken(refreshToken);

      if (!refreshPayload.data?.user?.id) {
        resetCookies(reply);
        throw new UnauthorizedException("Invalid refresh token", {
          errorCode: ErrorCode.AUTH_INVALID_TOKEN,
        });
      }

      const user = (await userService.getUserById(refreshPayload.data.user.id))
        ?.data;

      if (!user) {
        resetCookies(reply);
        throw new UnauthorizedException("User not found", {
          errorCode: ErrorCode.AUTH_INVALID_TOKEN,
        });
      }

      await setCookies(reply, { ...refreshPayload.data.user, role: user.role });
      request.user = { ...refreshPayload.data.user, role: user.role as Role };
      return;
    }

    resetCookies(reply);
    throw new UnauthorizedException("Invalid token", {
      errorCode: ErrorCode.AUTH_INVALID_TOKEN,
    });
  };
  redirectIfLoggedIn = async (req: FastifyRequest, rep: FastifyReply) => {
    try {
      const { accessToken: atkn, refreshToken: rtkn } = getRequestTokens(req);

      // If both exist, try to verify access token
      if (atkn && rtkn) {
        const { data } = await verifyAccessToken(atkn);
        if (data?.user) {
          return rep.redirect(APP_CONFIG.APP_URL); // already logged in → redirect
        }
      }
    } catch (err) {
      // ignore errors → let request continue
    }
  };
}

export default new AuthMiddleware();
