import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { DRIZZLE_DB } from "./constant";

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: DRIZZLE_DB,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const connectionString = config.get<string>("DATABASE_URL");
        const envSslMode = (config.get<string>("PGSSLMODE") ?? "").toLowerCase();
        const urlSslMode =
          connectionString?.match(/sslmode=([^&]+)/i)?.[1]?.toLowerCase() ?? "";

        // Use SSL unless explicitly disabled. We default to allowing self-signed certs
        // when sslmode is require/no-verify to avoid SELF_SIGNED_CERT errors.
        const useSsl =
          envSslMode !== "disable" ||
          (urlSslMode && urlSslMode !== "disable") ||
          (connectionString ?? "").includes("sslmode=");
        const verifySsl =
          envSslMode === "verify-full" ||
          envSslMode === "verify-ca" ||
          urlSslMode === "verify-full" ||
          urlSslMode === "verify-ca";

        const pool = new Pool({
          connectionString,
          ssl: useSsl ? { rejectUnauthorized: verifySsl } : undefined,
        });

        return drizzle(pool);
      },
    },
  ],
  exports: [DRIZZLE_DB],
})
export class DrizzleModule {}
