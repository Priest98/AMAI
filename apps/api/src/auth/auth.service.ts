import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto } from '@marketing-os/shared-types';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@marketing-os/database';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    // Create User, Default Org, and Default Brand in a transaction to ensure zero-friction onboarding
    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          name: dto.name,
        },
      });

      const orgName = `${dto.name || 'My'} Workspace`;
      const org = await tx.organization.create({
        data: {
          name: orgName,
          slug: orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.floor(Math.random() * 1000),
          ownerId: newUser.id,
          members: {
            create: {
              userId: newUser.id,
              role: Role.OWNER
            }
          }
        }
      });

      await tx.brand.create({
        data: {
          name: 'My Primary Brand',
          organizationId: org.id
        }
      });

      return newUser;
    });

    return this.generateAuthResponse(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateAuthResponse(user);
  }

  private async generateAuthResponse(user: any) {
    // Fetch the user's first brand so we can embed it in the token
    const membership = await this.prisma.organizationMember.findFirst({
      where: { userId: user.id },
      include: {
        organization: {
          include: { brands: { take: 1, orderBy: { createdAt: 'asc' } } }
        }
      }
    });

    const brandId = membership?.organization?.brands?.[0]?.id ?? null;

    const payload = { sub: user.id, email: user.email, brandId };
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        brandId,
      },
      accessToken: this.jwtService.sign(payload),
    };
  }
}

