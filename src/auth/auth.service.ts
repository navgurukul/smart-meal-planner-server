import { Injectable, UnauthorizedException, Logger, Inject, BadRequestException } from '@nestjs/common';
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

      // Find user in database
      let user = await this.findUserByEmail(loginDto.email);

      if (!user) {
        // User doesn't exist - you may want to either:
        // 1. Auto-register them (commented out below)
        // 2. Return error that admin needs to create account first
        throw new UnauthorizedException(
          'User not found. Please contact administrator to create your account.'
        );
        
        // Uncomment below to auto-register users:
        // user = await this.createUser(googleUser);
      }

      // Check if user is active
      if (user.status !== 'active') {
        throw new UnauthorizedException('User account is not active');
      }

      // Update user's Google ID if not set
      if (!user.googleId) {
        user = await this.updateUserGoogleId(user.id, googleUser.googleId);
      }

      // Generate JWT token
      const payload = {
        sub: user.id,
        email: user.email,
        name: user.name,
        campusId: user.campusId,
        status: user.status,
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
          status: user.status,
          address: user.address,
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
      const userProfile = await this.findUserById(user.sub);
      
      if (!userProfile) {
        throw new UnauthorizedException('User not found');
      }

      if (userProfile.status !== 'active') {
        throw new UnauthorizedException('User account is not active');
      }

      return {
        id: userProfile.id,
        email: userProfile.email,
        name: userProfile.name,
        campusId: userProfile.campusId,
        address: userProfile.address,
        status: userProfile.status,
        createdAt: userProfile.createdAt,
        updatedAt: userProfile.updatedAt,
      };
    } catch (error) {
      this.logger.error('Get profile failed:', error);
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

  // OPTIONAL: Uncomment this if you want to auto-register users on first login
  // Make sure to handle the campusId requirement appropriately
  /*
  private async createUser(googleUser: any) {
    try {
      // You'll need to determine how to assign campusId
      // Option 1: Have a default campus
      // Option 2: Extract from email domain
      // Option 3: Require admin to pre-create users
      
      const defaultCampusId = 1; // Set your default campus ID
      
      const [newUser] = await this.db
        .insert(schema.users)
        .values({
          email: googleUser.email,
          name: googleUser.name || 'New User',
          googleId: googleUser.googleId,
          campusId: defaultCampusId,
          status: 'active',
        })
        .returning();

      this.logger.log(`New user created: ${newUser.email}`);
      return newUser;
    } catch (error) {
      this.logger.error('Create user failed:', error);
      throw new UnauthorizedException('Unable to create user');
    }
  }
  */
}