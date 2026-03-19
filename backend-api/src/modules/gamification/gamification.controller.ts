import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { GamificationService } from './gamification.service';
import { FirebaseAuthGuard } from '../firebase/guards/firebase-auth.guard';
import { LeaderboardQueryDto } from './dto/leaderboard-query.dto';

@Controller('gamification')
@UseGuards(FirebaseAuthGuard)
export class GamificationController {
  constructor(private readonly gamificationService: GamificationService) {}

  @Get('profile')
  async getProfile(@Request() req) {
    return this.gamificationService.getProfile(req.user.userId);
  }

  @Get('badges')
  async getBadges(@Request() req) {
    return this.gamificationService.getBadges(req.user.userId);
  }

  @Get('leaderboard')
  async getLeaderboard(@Request() req, @Query() query: LeaderboardQueryDto) {
    return this.gamificationService.getLeaderboard(
      req.user.userId,
      query.period || 'weekly',
      query.page || 1,
      query.limit || 50,
    );
  }

  @Get('challenges')
  async getChallenges(@Request() req) {
    return this.gamificationService.getChallenges(req.user.userId);
  }

  @Post('challenges/:id/claim')
  @HttpCode(HttpStatus.OK)
  async claimChallenge(@Request() req, @Param('id') challengeId: string) {
    return this.gamificationService.claimChallenge(
      req.user.userId,
      challengeId,
    );
  }

  @Get('events/recent')
  async getRecentEvents(@Request() req) {
    return this.gamificationService.getRecentEvents(req.user.userId);
  }

  @Get('events/history')
  async getEventHistory(
    @Request() req,
    @Query('limit') limit?: string,
  ) {
    return this.gamificationService.getEventHistory(
      req.user.userId,
      limit ? parseInt(limit, 10) : 30,
    );
  }

  @Patch('events/read-all')
  @HttpCode(HttpStatus.OK)
  async markAllEventsRead(@Request() req) {
    return this.gamificationService.markAllEventsRead(req.user.userId);
  }

  @Patch('events/:id/seen')
  @HttpCode(HttpStatus.OK)
  async markEventSeen(@Request() req, @Param('id') eventId: string) {
    return this.gamificationService.markEventSeen(req.user.userId, eventId);
  }

  @Patch('events/:id/read')
  @HttpCode(HttpStatus.OK)
  async markEventRead(@Request() req, @Param('id') eventId: string) {
    return this.gamificationService.markEventRead(req.user.userId, eventId);
  }
}
