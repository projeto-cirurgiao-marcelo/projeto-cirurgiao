import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { UpdateOnboardingDto } from './dto/update-profile.dto';

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(private prisma: PrismaService) {}

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
      };
    }

    return profile;
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

    this.logger.log(`Onboarding completed for user ${userId}: ${dto.specializations?.length || 0} specializations`);
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
