import { APP_CONFIG } from "@/config/app.config";
import { ErrorCode } from "@/enums/error-code.enum";
// @ts-ignore
import { JWTPayload, SignJWT, decodeJwt, jwtVerify } from "jose";
import { generateJti } from ".";
import {
  UnauthenticatedException,
  UnauthorizedException,
} from "./catch-errors";
import { getCookiesOptions } from "./cookie";
import { setRefreshTokenWithJTI } from "./redis";

type IJwtTokenData = {
  id: string;
  expiresIn?: string;
  iss?: string;
  aud?: string;
  jti?: string;
  [key: string]: any;
};

export type VerifyResult =
  | { isExpired: true; data: null; error: null }
  | { isExpired: false; data: null; error: UnauthorizedException }
  | {
      isExpired: false;
      data: { token_data: JWTPayload; user: IServerCookieType };
      error: null;
    };

/**
 * JWT Service Factory
 */
export function createJwtService(options: {
  secret: string;
  expiresIn: string;
  cookieExpiresIn?: string;
  issuer?: string;
  audience?: string;
  isRefreshToken?: boolean;
}) {
  const {
    secret,
    expiresIn,
    cookieExpiresIn,
    issuer,
    audience,
    isRefreshToken,
  } = options;
  const encodedSecret = new TextEncoder().encode(secret);

  /** Sign a JWT */
  async function sign(payload: IJwtTokenData) {
    const tokenPayload = { ...payload };
    if (!tokenPayload.iss && issuer) tokenPayload.iss = issuer;
    if (!tokenPayload.aud && audience) tokenPayload.aud = audience;

    return new SignJWT(tokenPayload)
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setIssuedAt()
      .setExpirationTime(payload.expiresIn || expiresIn)
      .sign(encodedSecret);
  }

  /** Verify a JWT */
  async function verify(
    token: string | null | undefined
  ): Promise<VerifyResult> {
    if (!token)
      return {
        isExpired: false,
        data: null,
        error: new UnauthenticatedException("Invalid Token", {
          errorCode: ErrorCode.AUTH_INVALID_TOKEN,
        }),
      };
    try {
      const { payload } = await jwtVerify(token, encodedSecret);
      const { iat, exp, jti, ...userData } = payload;
      return {
        isExpired: false,
        data: { token_data: payload, user: userData as IServerCookieType },
        error: null,
      };
    } catch (err: unknown) {
      if ((err as any).name === "JWTExpired")
        return { isExpired: true, data: null, error: null };
      return {
        isExpired: false,
        data: null,
        error: new UnauthenticatedException("Invalid Token", {
          errorCode: ErrorCode.AUTH_INVALID_TOKEN,
        }),
      };
    }
  }

  /** Decode JWT without verifying */
  function decode(token: string | null | undefined) {
    if (!token) return null;
    try {
      const payload = decodeJwt(token);
      const { iat, exp, jti, ...userData } = payload;
      return { token_data: payload, data: userData as IServerCookieType };
    } catch {
      return null;
    }
  }

  /** Generate token + cookie options */
  async function generate(payload: IJwtTokenData) {
    let jti: string | undefined;
    if (isRefreshToken) {
      jti = generateJti();
      payload.jti = jti;
    }

    const token = await sign(payload);
    if (isRefreshToken && jti) setRefreshTokenWithJTI(jti, { token });

    const cookieAttributes = cookieExpiresIn
      ? getCookiesOptions({ expiresIn: cookieExpiresIn })
      : {};

    return isRefreshToken
      ? { refreshToken: token, cookieAttributes, jti }
      : { accessToken: token, cookieAttributes };
  }

  return { sign, verify, decode, generate };
}

/** ------------------- USAGE ------------------- */

// Access token service
export const AccessTokenService = createJwtService({
  secret: APP_CONFIG.JWT_SECRET,
  expiresIn: APP_CONFIG.JWT_EXPIRES_IN,
  cookieExpiresIn: APP_CONFIG.JWT_COOKIE_EXPIRES_IN,
  issuer: APP_CONFIG.TOKEN_ISSUER,
  audience: APP_CONFIG.TOKEN_AUDIENCE,
});

// Refresh token service
export const RefreshTokenService = createJwtService({
  secret: APP_CONFIG.JWT_REFRESH_SECRET,
  expiresIn: APP_CONFIG.JWT_REFRESH_EXPIRES_IN,
  cookieExpiresIn: APP_CONFIG.JWT_COOKIE_EXPIRES_IN,
  issuer: APP_CONFIG.TOKEN_ISSUER,
  audience: APP_CONFIG.TOKEN_AUDIENCE,
  isRefreshToken: true,
});
