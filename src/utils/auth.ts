import { APP_CONFIG } from '@/config/app.config';

const arcticImport = async () => await eval('import("arctic")');
export const googleAuth = async () => {
  const { Google: G, Google } = await arcticImport();
  return new Google(
    APP_CONFIG.GOOGLE_CLIENT_ID,
    APP_CONFIG.GOOGLE_CLIENT_SECRET,
    `${APP_CONFIG.HOST_NAME}/api/google/callback`
  ) as typeof G;
};

export const getCodeVerifierandState = async () => {
  const { generateCodeVerifier, generateState } = await arcticImport();
  return { generateCodeVerifier, generateState };
};

export const getArcticeMethods = async () => {
  const { generateCodeVerifier, generateState, decodeIdToken, OAuth2Tokens } = await arcticImport();
  return { generateCodeVerifier, generateState, decodeIdToken, OAuth2Tokens };
};
