// src/types/fastify.d.ts

import { inngest } from "@/app_inngest";
import { RedisClient } from "@/config/redis";
import RedisSocket from "@/config/socket"; // your current implementation
import * as schema from "@/db/schema";
import { Customer } from "@polar-sh/sdk/models/components/customer.js";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import "fastify";
import { FastifyRequest as FType } from "fastify";
import postgres from "postgres";

declare module "fastify" {
  export interface FastifyInstance {
    redis: RedisClient;
    db: PostgresJsDatabase<typeof schema> & {
      $client: postgres.Sql<{}>;
    };
    logger: import("pino").Logger;
    redis_socket: RedisSocket;
    inngest: typeof inngest;
  }

  export interface FastifyRequest extends FType {
    user?: IServerCookieType;
    tokenData?: any;
    customer: Customer;
  }
}
