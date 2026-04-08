/* Minimal type declarations for Google Identity Services (GIS) */

interface TokenResponse {
  access_token?: string;
  error?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
}

interface TokenClient {
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
}

interface TokenClientConfig {
  client_id: string;
  scope: string;
  callback: (response: TokenResponse) => void;
  error_callback?: (error: { type: string; message: string }) => void;
}

interface GoogleAccountsOAuth2 {
  initTokenClient: (config: TokenClientConfig) => TokenClient;
  revoke: (token: string, done?: () => void) => void;
}

interface GoogleAccounts {
  oauth2: GoogleAccountsOAuth2;
}

interface Google {
  accounts: GoogleAccounts;
}

declare global {
  interface Window {
    google: Google;
  }
}

export {};
