import { type APL, type AplConfiguredResult, type AplReadyResult, type AuthData } from "@saleor/app-sdk/APL";
import type { Redis } from "ioredis";

// Based on the RedisAPL implementation by https://github.com/JannikZed

type RedisAPLConfig = {
  /** Redis client instance to use for storage */
  client: Redis;
  /** Optional key to use for the hash collection. Defaults to "saleor_app_auth" */
  hashCollectionKey?: string;
};

export class RedisAPL implements APL {
  private client: Redis;
  private hashCollectionKey: string;

  constructor(config: RedisAPLConfig) {
    this.client = config.client;
    this.hashCollectionKey = config.hashCollectionKey || "saleor_app_auth";
  }

  async get(saleorApiUrl: string): Promise<AuthData | undefined> {
    const authData = await this.client.hget(this.hashCollectionKey, saleorApiUrl);

    if (!authData) return undefined;

    return JSON.parse(authData) as AuthData;
  }

  async set(authData: AuthData): Promise<void> {
    await this.client.hset(this.hashCollectionKey, authData.saleorApiUrl, JSON.stringify(authData));
  }

  async delete(saleorApiUrl: string): Promise<void> {
    await this.client.hdel(this.hashCollectionKey, saleorApiUrl);
  }

  async getAll(): Promise<AuthData[]> {
    const allData = await this.client.hgetall(this.hashCollectionKey);

    return Object.values(allData || {}).map((data) => JSON.parse(data) as AuthData);
  }

  async isReady(): Promise<AplReadyResult> {
    try {
      const ping = await this.client.ping();

      return ping === "PONG"
        ? { ready: true }
        : { ready: false, error: new Error("Redis server did not respond with PONG") };
    } catch (error) {
      return { ready: false, error: error as Error };
    }
  }

  async isConfigured(): Promise<AplConfiguredResult> {
    try {
      const ping = await this.client.ping();

      return ping === "PONG"
        ? { configured: true }
        : { configured: false, error: new Error("Redis connection not configured properly") };
    } catch (error) {
      return { configured: false, error: error as Error };
    }
  }
}
