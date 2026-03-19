import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ProfileService } from './profile.service';
import { UpdateOnboardingDto } from './dto/update-profile.dto';
import { FirebaseAuthGuard } from '../firebase/guards/firebase-auth.guard';

@Controller('profile')
@UseGuards(FirebaseAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  async getProfile(@Request() req: any) {
    return this.profileService.getProfile(req.user.id);
  }

  @Put('onboarding')
  async completeOnboarding(
    @Request() req: any,
    @Body() dto: UpdateOnboardingDto,
  ) {
    return this.profileService.completeOnboarding(req.user.id, dto);
  }

  @Post('onboarding/skip')
  async skipOnboarding(@Request() req: any) {
    return this.profileService.skipOnboarding(req.user.id);
  }
}
