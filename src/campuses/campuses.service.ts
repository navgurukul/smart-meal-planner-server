import { Injectable } from "@nestjs/common";
import { Inject } from "@nestjs/common/decorators";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { DRIZZLE_DB } from "src/db/constant";
import * as schema from "src/schema/schema";

@Injectable()
export class CampusesService {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async list() {
    return this.db
      .select({
        id: schema.campuses.id,
        name: schema.campuses.name,
        address: schema.campuses.address,
        status: schema.campuses.status,
      })
      .from(schema.campuses);
  }
}
