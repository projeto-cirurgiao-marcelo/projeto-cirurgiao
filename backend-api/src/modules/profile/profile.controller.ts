import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProfileService } from './profile.service';
import { UpdateOnboardingDto, UpdateFullProfileDto, ChangePasswordDto } from './dto/update-profile.dto';
import { FirebaseAuthGuard } from '../firebase/guards/firebase-auth.guard';
import { UploadService } from '../upload/upload.service';

@Controller('profile')
@UseGuards(FirebaseAuthGuard)
export class ProfileController {
  constructor(
    private readonly profileService: ProfileService,
    private readonly uploadService: UploadService,
  ) {}

  /**
   * GET /profile - Busca perfil completo
   */
  @Get()
  async getProfile(@Request() req: any) {
    return this.profileService.getFullProfile(req.user.id);
  }

  /**
   * PUT /profile - Atualiza perfil completo
   */
  @Put()
  async updateProfile(
    @Request() req: any,
    @Body() dto: UpdateFullProfileDto,
  ) {
    return this.profileService.updateFullProfile(req.user.id, dto);
  }

  /**
   * POST /profile/photo - Upload de foto de perfil
   */
  @Post('photo')
  @UseInterceptors(FileInterceptor('file'))
  async uploadPhoto(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado');
    }

    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Apenas imagens são permitidas');
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('Arquivo muito grande. Máximo 5MB');
    }

    const url = await this.uploadService.uploadToR2(file, 'profile-photos');

    // Salvar no perfil
    await this.profileService.updateFullProfile(req.user.id, { photoUrl: url });

    return { url };
  }

  /**
   * POST /profile/change-password - Alterar senha
   */
  @Post('change-password')
  async changePassword(
    @Request() req: any,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.profileService.changePassword(req.user.id, dto);
  }

  /**
   * PUT /profile/onboarding - Completar onboarding
   */
  @Put('onboarding')
  async completeOnboarding(
    @Request() req: any,
    @Body() dto: UpdateOnboardingDto,
  ) {
    return this.profileService.completeOnboarding(req.user.id, dto);
  }

  /**
   * POST /profile/onboarding/skip - Pular onboarding
   */
  @Post('onboarding/skip')
  async skipOnboarding(@Request() req: any) {
    return this.profileService.skipOnboarding(req.user.id);
  }
}
