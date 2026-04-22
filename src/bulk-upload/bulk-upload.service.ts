import { BadRequestException, Injectable } from "@nestjs/common";
import { Inject } from "@nestjs/common/decorators";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { DRIZZLE_DB } from "src/meal-items/db/constant";
import * as schema from "src/schema/schema";
import { updateStudentByIdDto } from "./dto/bulk-upload.dto";
import { users } from 'src/schema/schema';
import {
    eq,
    ilike,
} from 'drizzle-orm';
import { log } from 'console';
import { UsersService } from "src/users/users.service";
import type { AuthenticatedUser } from "src/middleware/auth.middleware";

@Injectable()
export class BulkUploadService {
    constructor(
        @Inject(DRIZZLE_DB)
        private readonly db: NodePgDatabase<typeof schema>,
        private readonly usersService: UsersService,
    ) { }

    async addStudentToCampus(
        users_data: any[],
    ) {
        try {
            var duplicateStudentCount = 0,
                privilegedRoleLabels: string[] = [],
                c = 0;
            let enrollments: any[] = [];

            let userReport: Array<{ email: string; message: string }> = [];
            for (let i = 0; i < users_data.length; i++) {

                const [campus] = await this.db
                    .select({ id: schema.campuses.id, name: schema.campuses.name })
                    .from(schema.campuses)
                    .where(ilike(schema.campuses.name, (users_data[i]['campus_name'] ?? '').trim()));
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
                    // Fetch the user's existing role(s)
                    const existingRoles = await this.db
                        .select({ roleName: schema.roles.name })
                        .from(schema.userRole)
                        .innerJoin(schema.roles, eq(schema.userRole.roleId, schema.roles.id))
                        .where(eq(schema.userRole.userId, userInfo[0].id));

                    const nonStudentRole = existingRoles.find(
                        (r) => r.roleName !== 'STUDENT',
                    );

                    if (nonStudentRole) {
                        // User has a privileged role — track label for fullMessage
                        const roleLabel = nonStudentRole.roleName
                            .replace('_', ' ')
                            .toLowerCase()
                            .replace(/\b\w/g, (ch) => ch.toUpperCase()); // e.g. "Super Admin"
                        privilegedRoleLabels.push(roleLabel);
                        userReport.push({
                            email: userInfo[0].email,
                            message: `The user you're trying to add is already a ${roleLabel}`,
                        });
                    } else {
                        // Regular duplicate student — show which campus they belong to
                        duplicateStudentCount += 1;
                        const [existingCampus] = await this.db
                            .select({ name: schema.campuses.name })
                            .from(schema.campuses)
                            .where(eq(schema.campuses.id, userInfo[0].campusId));
                        const existingCampusName = existingCampus?.name ?? 'another campus';
                        userReport.push({
                            email: userInfo[0].email,
                            message: `The student is already in the ${existingCampusName} campus`,
                        });
                    }
                }
                if (userInfo.length === 0) {
                    userInfo = await this.db.insert(users).values(newUser).returning();

                    const roleId = await this.usersService.ensureRole("STUDENT");
                    await this.db.insert(schema.userRole).values({
                        userId: userInfo[0].id,
                        roleId: roleId,
                    });

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
                messageParts.push(`${c} ${c > 1 ? 'students are' : 'student is'} successfully added to the ${users_data[0]['campus_name']} campus`);
            }
            if (duplicateStudentCount > 0) {
                messageParts.push(`${duplicateStudentCount} ${duplicateStudentCount > 1 ? 'students are' : 'student is'} already assigned to a campus`);
            }
            if (privilegedRoleLabels.length > 0) {
                // Group by role label and mention each unique role in the summary
                const roleCounts = privilegedRoleLabels.reduce<Record<string, number>>((acc, label) => {
                    acc[label] = (acc[label] ?? 0) + 1;
                    return acc;
                }, {});
                for (const [label, count] of Object.entries(roleCounts)) {
                    messageParts.push(`${count} ${count > 1 ? 'users are' : 'user is'} already a${label.startsWith('A') || label.startsWith('I') ? 'n' : ''} ${label}`);
                }
            }

            let message = messageParts.join(' & ');
            const fullMessage = `Out of ${users_data.length} ${users_data.length > 1 ? 'students' : 'student'}, ${message}`;

            return [
                null,
                {
                    status: 'success',
                    code: 200,
                    message: fullMessage,
                    students_enrolled: userReport
                },
            ];
        } catch (e: any) {
            log(`error: ${e.message}`);
            return [{ status: 'error', message: e.message, code: 500 }, null];
        }
    }

    async updateStudentById(studentId: number, studentData: updateStudentByIdDto) {
        try {
            const studentName = studentData.name?.trim();
            const campusName = studentData.campus_name?.trim();
            const campusId = studentData.campus_id;

            const [existingUser] = await this.db
                .select({
                    id: schema.users.id,
                    email: schema.users.email,
                })
                .from(schema.users)
                .where(eq(schema.users.id, studentId));

            if (!existingUser) {
                throw new BadRequestException('Student not found');
            }

            const existingRoles = await this.db
                .select({ roleName: schema.roles.name })
                .from(schema.userRole)
                .innerJoin(schema.roles, eq(schema.userRole.roleId, schema.roles.id))
                .where(eq(schema.userRole.userId, existingUser.id));

            const nonStudentRole = existingRoles.find(
                (role) => role.roleName !== 'STUDENT',
            );

            if (nonStudentRole) {
                const roleLabel = nonStudentRole.roleName
                    .replace(/_/g, ' ')
                    .toLowerCase()
                    .replace(/\b\w/g, (ch) => ch.toUpperCase());

                throw new BadRequestException(
                    `Cannot update because user is already a ${roleLabel}`,
                );
            }

            if (!campusId && !campusName) {
                throw new BadRequestException('Either campus_id or campus_name is required');
            }

            let campus;
            if (campusId) {
                [campus] = await this.db
                    .select({ id: schema.campuses.id, name: schema.campuses.name })
                    .from(schema.campuses)
                    .where(eq(schema.campuses.id, campusId));
            } else {
                [campus] = await this.db
                    .select({ id: schema.campuses.id, name: schema.campuses.name })
                    .from(schema.campuses)
                    .where(ilike(schema.campuses.name, campusName!));
            }

            if (!campus) {
                throw new BadRequestException('Campus not found');
            }

            await this.db
                .update(schema.users)
                .set({
                    name: studentName,
                    campusId: campus.id,
                    updatedAt: new Date(),
                })
                .where(eq(schema.users.id, existingUser.id));

            await this.db
                .update(schema.userCampuses)
                .set({ isPrimary: false })
                .where(eq(schema.userCampuses.userId, existingUser.id));

            await this.db
                .insert(schema.userCampuses)
                .values({
                    userId: existingUser.id,
                    campusId: campus.id,
                    isPrimary: true,
                })
                .onConflictDoUpdate({
                    target: [schema.userCampuses.userId, schema.userCampuses.campusId],
                    set: { isPrimary: true },
                });

            return [
                null,
                {
                    status: 'success',
                    code: 200,
                    message: 'Student updated successfully',
                    student_updated: {
                        id: existingUser.id,
                        email: existingUser.email,
                        name: studentName,
                        campus_id: campus.id,
                        campus_name: campus.name,
                    },
                },
            ];
        } catch (e: any) {
            log(`error: ${e.message}`);
            return [{ status: 'error', message: e.message, code: 500 }, null];
        }
    }

    async deleteStudentById(studentId: number, requester: AuthenticatedUser) {
        try {
            const result = await this.usersService.deleteUser(studentId, requester);
            return [null, result];
        } catch (e: any) {
            log(`error: ${e.message}`);
            return [{ status: 'error', message: e.message, code: 500 }, null];
        }
    }
}