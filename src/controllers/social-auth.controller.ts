import { APP_CONFIG, ENVIRONMENTS } from "@/config/app.config";
import { HTTPSTATUS } from "@/config/http.config";
import { AccountType, Provider } from "@/db";
import { userService } from "@/services/user.service";
import { getArcticeMethods, googleAuth } from "@/utils/auth";
import { InternalServerException } from "@/utils/catch-errors";
import { setCookies } from "@/utils/cookie";
import { setRefreshTokenWithJTI } from "@/utils/redis";
import { FastifyReply, FastifyRequest } from "fastify";

const googleCookies = {
  google_oauth_state: "google_oauth_state",
  google_code_verifier: "google_code_verifier",
};

const Google_Cookies_options = {
  path: "/",
  httpOnly: true,
  maxAge: 600 * 1000,
  secure: ENVIRONMENTS.isProduction,
};

class SocialAuthController {
  constructor() {}

  public googleSignAuth = async (_req: FastifyRequest, reply: FastifyReply) => {
    try {
      const { generateState, generateCodeVerifier } = await getArcticeMethods();
      const state = generateState();
      const codeVerifier = generateCodeVerifier();

      const gAuth = await googleAuth();

      reply
        .setCookie(
          googleCookies.google_oauth_state,
          state,
          Google_Cookies_options
        )
        .setCookie(
          googleCookies.google_code_verifier,
          codeVerifier,
          Google_Cookies_options
        );

      const generatedURL = gAuth.createAuthorizationURL(state, codeVerifier, [
        "profile",
        "email",
      ]);

      return reply.redirect(generatedURL, 302);
    } catch (error) {
      throw new InternalServerException();
    }
  };

  public googleAuthCallback = async (
    req: FastifyRequest,
    reply: FastifyReply
  ) => {
    try {
      const url = new URL(`${APP_CONFIG.HOST_NAME}${req.url}`);
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");

      const storedState =
        req.cookies?.[googleCookies.google_oauth_state] ?? null;
      const codeVerifier =
        req.cookies?.[googleCookies.google_code_verifier] ?? null;

      if (
        !code ||
        !state ||
        !storedState ||
        state !== storedState ||
        !codeVerifier
      ) {
        return reply
          .status(HTTPSTATUS.BAD_REQUEST)
          .send({ message: "Error on callback" });
      }

      const gAuth = await googleAuth();
      const tokens = await gAuth.validateAuthorizationCode(code, codeVerifier);
      const { decodeIdToken } = await getArcticeMethods();
      const googleUser = decodeIdToken(tokens.idToken()) as IGoogleUser;

      const { data: existingAccount } =
        await userService.getAccountByGoogleIdUseCase(googleUser.sub);

      if (existingAccount) {
        const { data: user } = await userService.getUserById(
          existingAccount.userId
        );
        const { jti, refreshToken } = await this.setCallbackCookie(reply, {
          id: existingAccount.userId,
          provider: AccountType.oauth,
          providerType: Provider.google,
          role: user?.role,
        });
        await setRefreshTokenWithJTI(jti, { token: refreshToken as string });
        return reply.redirect(APP_CONFIG.APP_URL);
      }

      const { data: user } = await userService.createGoogleUserUseCase(
        googleUser
      );

      if (user) {
        const { jti, refreshToken } = await this.setCallbackCookie(reply, {
          id: user.id,
          provider: AccountType.oauth,
          providerType: Provider.google,
          role: user.role,
        });
        await setRefreshTokenWithJTI(jti, { token: refreshToken as string });
      }

      return reply.redirect(APP_CONFIG.APP_URL);
    } catch (e: any) {
      throw new InternalServerException("Error on callback: " + e.message);
    }
  };

  public setCallbackCookie = async (
    reply: FastifyReply,
    tokenData: { id: string } & Record<string, any>
  ) => {
    const cookiesData = await setCookies(reply, tokenData);

    reply
      .clearCookie(googleCookies.google_code_verifier, Google_Cookies_options)
      .clearCookie(googleCookies.google_oauth_state, Google_Cookies_options);

    return cookiesData;
  };
}

export default new SocialAuthController();
