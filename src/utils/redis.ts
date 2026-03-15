import { APP_CONFIG } from "@/config/app.config";
import redisClient from "@/config/redis";
import { parseDurationToSeconds } from "./cookie";
export const REDIS_KEYS = {
  REFRESH_TOKEN_JTI: (jti?: string) => "refresh-token-jit:" + jti,
};
export const createRedisKey = (key: string) => {
  return `${APP_CONFIG.REDIS_KEY_PREFIX}${key}`;
};
export const replaceRedisPrefix = (
  key: string = "",
  withString: string = ""
) => {
  if (key == null || key?.trim() == "") {
    return "";
  }
  return key.replace(APP_CONFIG.REDIS_KEY_PREFIX || "", withString);
};
export const getRefreshTokenByJTI = async (jti?: string) => {
  if (!jti) {
    return null;
  }
  const jtires = await redisClient.get<IStoredRefreshToken>(
    REDIS_KEYS.REFRESH_TOKEN_JTI(jti)
  );
  if (!jtires) {
    return null;
  }

  return jtires;
};
export const setRefreshTokenWithJTI = async (
  jti?: string,
  text?: IStoredRefreshToken
) => {
  if (!jti || !text) {
    return null;
  }
  return await redisClient.set(
    REDIS_KEYS.REFRESH_TOKEN_JTI(jti),
    text,
    parseDurationToSeconds(APP_CONFIG.JWT_REFRESH_EXPIRES_IN || "7d")
  );
};
export const deleteRefreshTokenWithJTI = async (jti?: string) => {
  if (!jti) {
    return null;
  }

  return await redisClient.del(REDIS_KEYS.REFRESH_TOKEN_JTI(jti));
};
