import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { UpdateOnboardingDto, UpdateFullProfileDto, ChangePasswordDto } from './dto/update-profile.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Busca perfil completo do usuário (dados do User + UserProfile)
   */
  async getFullProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        profile: true,
      },
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      photoUrl: user.profile?.photoUrl || null,
      profession: user.profile?.profession || null,
      specializations: user.profile?.specializations || [],
      state: user.profile?.state || null,
      city: user.profile?.city || null,
      bio: user.profile?.bio || null,
      onboardingCompleted: user.profile?.onboardingCompleted || false,
    };
  }

  async getProfile(userId: string) {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return {
        onboardingCompleted: false,
        specializations: [],
        profession: null,
        state: null,
        city: null,
        photoUrl: null,
        bio: null,
      };
    }

    return profile;
  }

  /**
   * Atualiza perfil completo (nome, profissão, bio, foto, etc.)
   */
  async updateFullProfile(userId: string, dto: UpdateFullProfileDto) {
    this.logger.log(`Updating full profile for user ${userId}`);

    // Atualizar nome no User se fornecido
    if (dto.name) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { name: dto.name },
      });
    }

    // Atualizar/criar UserProfile
    const profile = await this.prisma.userProfile.upsert({
      where: { userId },
      update: {
        profession: dto.profession !== undefined ? dto.profession : undefined,
        specializations: dto.specializations !== undefined ? dto.specializations : undefined,
        state: dto.state !== undefined ? dto.state : undefined,
        city: dto.city !== undefined ? dto.city : undefined,
        bio: dto.bio !== undefined ? dto.bio : undefined,
        photoUrl: dto.photoUrl !== undefined ? dto.photoUrl : undefined,
      },
      create: {
        userId,
        profession: dto.profession || null,
        specializations: dto.specializations || [],
        state: dto.state || null,
        city: dto.city || null,
        bio: dto.bio || null,
        photoUrl: dto.photoUrl || null,
        onboardingCompleted: true,
      },
    });

    this.logger.log(`Profile updated for user ${userId}`);
    return this.getFullProfile(userId);
  }

  /**
   * Alterar senha do usuário
   */
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('Usuário não encontrado');
    }

    // Verificar senha atual
    const isCurrentValid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isCurrentValid) {
      throw new BadRequestException('Senha atual incorreta');
    }

    // Hash da nova senha
    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    this.logger.log(`Password changed for user ${userId}`);
    return { message: 'Senha alterada com sucesso' };
  }

  async completeOnboarding(userId: string, dto: UpdateOnboardingDto) {
    this.logger.log(`Completing onboarding for user ${userId}`);

    const profile = await this.prisma.userProfile.upsert({
      where: { userId },
      update: {
        specializations: dto.specializations || [],
        profession: dto.profession || null,
        state: dto.state || null,
        city: dto.city || null,
        onboardingCompleted: true,
      },
      create: {
        userId,
        specializations: dto.specializations || [],
        profession: dto.profession || null,
        state: dto.state || null,
        city: dto.city || null,
        onboardingCompleted: true,
      },
    });

    return profile;
  }

  async skipOnboarding(userId: string) {
    this.logger.log(`User ${userId} skipped onboarding`);

    const profile = await this.prisma.userProfile.upsert({
      where: { userId },
      update: { onboardingCompleted: true },
      create: {
        userId,
        onboardingCompleted: true,
        specializations: [],
      },
    });

    return profile;
  }
}
