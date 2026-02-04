import { BadRequestException, Injectable } from "@nestjs/common";
import { Inject } from "@nestjs/common/decorators";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { DRIZZLE_DB } from "src/meal-items/db/constant";
import * as schema from "src/schema/schema";
import { User } from 'src/users/entities/user.entity';
import { studentDataDto } from "./dto/bulk-upload.dto";
import { users } from 'src/schema/schema';
import {
  eq,
  sql,
} from 'drizzle-orm';
import { error, log } from 'console';

@Injectable()
export class BulkUploadService {
      constructor(
        @Inject(DRIZZLE_DB)
        private readonly db: NodePgDatabase<typeof schema>,
      ) {}

    async addStudentToCampus(
        users_data: any[],
    ) {
        try {
        var b = 0,
        c = 0;
        let enrollments: any[] = [];

        if (users_data.length == 1) {
            let userData = await this.db
            .select()
            .from(users)
            .where(eq(users.email, users_data[0].email));
            if (userData.length >= 1) {
                if (userData[0].name !== users_data[0].name) {
                    await this.db
                    .update(users)
                    .set({ name: users_data[0].name })
                    .where(eq(users.email, users_data[0].email));
                }
            }
        }

        let userReport: Array<{ email: string; message: string }> = [];
        for (let i = 0; i < users_data.length; i++) {

            const [campus] = await this.db
                .select({ id: schema.campuses.id, name: schema.campuses.name })
                .from(schema.campuses)
                .where(eq(schema.campuses.name, users_data[i]['campus_name']));
            if (!campus) {
                throw new BadRequestException("Campus not found");
            }

            let newUser = {
                email: users_data[i]['email'],
                name: users_data[i]['name'],
                campusId: campus.id,
            };

            let enroling;
            let userInfo = await this.db
            .select()
            .from(users)
            .where(eq(users.email, users_data[i]['email']));

            if (userInfo.length > 0) {
                if (userInfo[0].name !== users_data[i]['name']) {
                    await this.db
                    .update(users)
                    .set({ name: users_data[i]['name'] })
                    .where(sql`${users.email} = ${users_data[i]['email']}`);
                } else {
                    b += 1;
                    userReport.push({
                        email: userInfo[0].email,
                        message: `The students have been already in the campus`,
                    });
                }
            }
            if (userInfo.length === 0) {
                userInfo = await this.db.insert(users).values(newUser).returning();

                c += 1;
                const now = new Date();
                enroling = {
                    userId: userInfo[0].id,
                    enrolledDate: now,
                    lastActiveDate: now,
                    status: 'active',
                    roles: ["STUDENT"]
                };

                // Look into this part
                userReport.push({
                    email: userInfo[0].email,
                    message: `Added successfully`,
                });
                enrollments.push(enroling);
            }
        }

        let messageParts: string[] = [];

        if (c > 0) {
            messageParts.push(`${c} students successfully added to the ${users_data[0]['campus_name']} campus`);
        }
        if (b > 0) {
            messageParts.push(`${b} students has been already in the ${users_data[0]['campus_name']} campus`);
        }

        let message = messageParts.join(' & ');

        return [
            null,
            {
            status: 'success',
            code: 200,
            message: message,
            students_enrolled: userReport
            },
        ];
        } catch (e) {
        log(`error: ${e.message}`);
        return [{ status: 'error', message: e.message, code: 500 }, null];
        }
    }
}