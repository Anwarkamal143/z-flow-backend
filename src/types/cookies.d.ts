type IServerCookieType = {
  id: string;
  provider: string;
  providerType: string;
  role: string;
};
type IStoredRefreshToken = {
  token: string;
  // issuedAt: number;
  // expiresAt: number;
};
