import { Injectable, UnauthorizedException, Logger, Inject, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { eq } from 'drizzle-orm';
import { OAuth2Client } from 'google-auth-library';
import { DRIZZLE_DB } from 'src/db/constant';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../schema/schema'; // Import your database schema

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly googleAuthClient: OAuth2Client;

  constructor(
    private jwtService: JwtService,
    @Inject(DRIZZLE_DB) private readonly db: NodePgDatabase
  ) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    this.googleAuthClient = new OAuth2Client(clientId);
  }

  async login(loginDto: LoginDto) {
    try {
      // Verify Google ID token
      const googleUser = await this.verifyGoogleToken(loginDto.googleIdToken);
      console.log('Google User:', googleUser);

      if (googleUser.email !== loginDto.email) {
        throw new UnauthorizedException('Email mismatch');
      }

      // Find user in database; auto-register if missing
      let user = await this.findUserByEmail(loginDto.email);

      if (!user) {
        user = await this.autoRegisterUser(googleUser);
      }

      // Check if user is active
      if (user.status !== 'active') {
        throw new UnauthorizedException('User account is not active');
      }

      // Update user's Google ID if not set
      if (!user.googleId) {
        user = await this.updateUserGoogleId(user.id, googleUser.googleId);
      }

      const campusName = await this.getCampusName(user.campusId);

      // Generate JWT token
      const roleRows = await this.db
        .select({ roleName: schema.roles.name })
        .from(schema.userRole)
        .innerJoin(schema.roles, eq(schema.userRole.roleId, schema.roles.id))
        .where(eq(schema.userRole.userId, user.id));
      const roles = roleRows.map((r) => r.roleName);

      const payload = {
        sub: user.id,
        email: user.email,
        name: user.name,
        campusId: user.campusId,
        campusName,
        status: user.status,
        roles,
      };

      const access_token = this.jwtService.sign(payload);

      this.logger.log(`User logged in: ${user.email}`);

      return {
        access_token,
        user: {
        id: user.id,
        email: user.email,
        name: user.name,
        campusId: user.campusId,
        campusName,
        status: user.status,
        address: user.address,
        roles,
      },
    };
    } catch (error) {
      this.logger.error('Login failed:', error);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid Google token or authentication failed');
    }
  }

  async logout(user: any) {
    this.logger.log(`User logged out: ${user.email}`);
    
    // If you want to implement token blacklisting, add logic here
    // For now, we'll just return a success message
    // The client should discard the token on their end
    
    return {
      message: 'Successfully logged out',
    };
  }

  async getProfile(user: any) {
    try {
      const userProfile =
        (user?.sub && (await this.findUserById(user.sub))) ||
        (user?.email && (await this.findUserByEmail(user.email)));

      if (!userProfile) {
        throw new NotFoundException('User not found');
      }

      if (userProfile.status !== 'active') {
        throw new UnauthorizedException('User account is not active');
      }

      const roleRows = await this.db
        .select({ roleName: schema.roles.name })
        .from(schema.userRole)
        .innerJoin(schema.roles, eq(schema.userRole.roleId, schema.roles.id))
        .where(eq(schema.userRole.userId, userProfile.id));
      const campusName = await this.getCampusName(userProfile.campusId);

      return {
        id: userProfile.id,
        email: userProfile.email,
        name: userProfile.name,
        campusId: userProfile.campusId,
        campusName,
        address: userProfile.address,
        status: userProfile.status,
        createdAt: userProfile.createdAt,
        updatedAt: userProfile.updatedAt,
        roles: roleRows.map((r) => r.roleName),
      };
    } catch (error) {
      this.logger.error('Get profile failed:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Unable to fetch user profile');
    }
  }

  async refreshToken(user: any) {
    try {
      // Verify user still exists and is active
      const userProfile = await this.findUserById(user.sub);
      
      if (!userProfile) {
        throw new UnauthorizedException('User not found');
      }

      if (userProfile.status !== 'active') {
        throw new UnauthorizedException('User account is not active');
      }

      const payload = {
        sub: user.sub,
        email: user.email,
        name: user.name,
        campusId: user.campusId,
        status: user.status,
      };

      const access_token = this.jwtService.sign(payload);

      this.logger.log(`Token refreshed for user: ${user.email}`);

      return {
        access_token,
      };
    } catch (error) {
      this.logger.error('Token refresh failed:', error);
      throw new UnauthorizedException('Unable to refresh token');
    }
  }

  private async verifyGoogleToken(token: string) {
    try {
      const ticket = await this.googleAuthClient.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      
      if (!payload) {
        throw new UnauthorizedException('Invalid Google token');
      }

      return {
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        googleId: payload.sub,
      };
    } catch (error) {
      this.logger.error('Google token verification failed:', error);
      throw new UnauthorizedException('Invalid Google token');
    }
  }

  private async findUserByEmail(email: string) {
    try {
      const [user] = await this.db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, email))
        .limit(1);

      return user;
    } catch (error) {
      this.logger.error('Find user by email failed:', error);
      return null;
    }
  }

  private async findUserById(id: number) {
    try {
      const [user] = await this.db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, id))
        .limit(1);

      return user;
    } catch (error) {
      this.logger.error('Find user by ID failed:', error);
      return null;
    }
  }

  private async getCampusName(campusId: number | null) {
    if (!campusId) return null;
    const [campus] = await this.db
      .select({ name: schema.campuses.name })
      .from(schema.campuses)
      .where(eq(schema.campuses.id, campusId));
    return campus?.name ?? null;
  }

  private async updateUserGoogleId(userId: number, googleId: string) {
    try {
      const [updatedUser] = await this.db
        .update(schema.users)
        .set({
          googleId: googleId,
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, userId))
        .returning();

      this.logger.log(`Updated Google ID for user: ${updatedUser.email}`);
      return updatedUser;
    } catch (error) {
      this.logger.error('Update user Google ID failed:', error);
      throw new UnauthorizedException('Unable to update user');
    }
  }

  private async ensureRole(name: string) {
    const roleName = name.toUpperCase();
    const [role] = await this.db
      .select({ id: schema.roles.id })
      .from(schema.roles)
      .where(eq(schema.roles.name, roleName));
    if (role) return role.id;

    const [created] = await this.db
      .insert(schema.roles)
      .values({
        name: roleName,
        description: `${roleName.toLowerCase()} role`,
      })
      .returning({ id: schema.roles.id });
    return created.id;
  }

  private async resolveDefaultCampusId() {
    const preferred = process.env.DEFAULT_CAMPUS_ID
      ? Number(process.env.DEFAULT_CAMPUS_ID)
      : null;
    if (preferred && !Number.isNaN(preferred)) {
      const [campus] = await this.db
        .select({ id: schema.campuses.id })
        .from(schema.campuses)
        .where(eq(schema.campuses.id, preferred));
      if (campus) return campus.id;
    }

    const [firstCampus] = await this.db
      .select({ id: schema.campuses.id })
      .from(schema.campuses)
      .limit(1);

    if (!firstCampus) {
      throw new BadRequestException(
        "No campus found to auto-register user; please seed campuses first",
      );
    }
    return firstCampus.id;
  }

  private async autoRegisterUser(googleUser: any) {
    const campusId = await this.resolveDefaultCampusId();
    const studentRoleId = await this.ensureRole("STUDENT");

    const [newUser] = await this.db
      .insert(schema.users)
      .values({
        email: googleUser.email,
        name: googleUser.name || "New User",
        googleId: googleUser.googleId,
        campusId,
        status: "active",
      })
      .returning();

    await this.db.insert(schema.userCampuses).values({
      userId: newUser.id,
      campusId,
      isPrimary: true,
    }).onConflictDoUpdate({
      target: [schema.userCampuses.userId, schema.userCampuses.campusId],
      set: { isPrimary: true },
    });

    await this.db
      .insert(schema.userRole)
      .values({
        userId: newUser.id,
        roleId: studentRoleId,
      })
      .onConflictDoNothing();

    this.logger.log(`Auto-registered user ${newUser.email} as STUDENT`);
    return newUser;
  }
}
