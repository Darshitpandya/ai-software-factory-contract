// Port uses short-lived JWT tokens obtained from client_id + client_secret.
// Tokens expire; this module handles transparent refresh.

interface PortTokenResponse {
  accessToken: string;
  expiresIn: number;
  tokenType: string;
}

interface CachedToken {
  accessToken: string;
  expiresAt: number; // epoch ms
}

export class PortTokenManager {
  private cached: CachedToken | null = null;

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly baseUrl: string
  ) {}

  async getToken(): Promise<string> {
    const now = Date.now();
    // Refresh 60 s before expiry
    if (this.cached && this.cached.expiresAt - now > 60_000) {
      return this.cached.accessToken;
    }
    return this.refresh();
  }

  private async refresh(): Promise<string> {
    const url = `${this.baseUrl}/v1/auth/access_token`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: this.clientId,
        clientSecret: this.clientSecret,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Port auth failed ${res.status}: ${body}`);
    }

    const data = (await res.json()) as PortTokenResponse;
    this.cached = {
      accessToken: data.accessToken,
      expiresAt: Date.now() + data.expiresIn * 1000,
    };
    return data.accessToken;
  }
}
