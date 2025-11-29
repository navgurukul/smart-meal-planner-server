import { Module } from "@nestjs/common";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

@Module({
  providers: [
    {
      provide: "DRIZZLE",
      useFactory: () => {
        const pool = new Pool({
          connectionString: process.env.DATABASE_URL,
        });

        return drizzle(pool);
      },
    },
  ],
  exports: ["DRIZZLE"],
})
export class DrizzleModule {}
