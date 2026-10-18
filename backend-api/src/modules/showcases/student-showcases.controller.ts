import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { IsString, MaxLength } from 'class-validator';
import { FirebaseAuthGuard } from '../firebase/guards/firebase-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { ShowcasesService } from './showcases.service';
import { ApplePurchasesService } from './apple-purchases.service';

class ApplePurchaseDto {
  /** `jwsRepresentation` da transação StoreKit 2 (assinado pela Apple). */
  @IsString()
  @MaxLength(16_000)
  jws: string;
}

/**
 * Lado do aluno: "o que é meu". Vitrines com entitlement ativo, upsell das
 * que ele não possui (checkout TheMembers no web/Android, IAP no iOS) e a
 * confirmação da compra In-App.
 */
@Controller('showcases')
@UseGuards(FirebaseAuthGuard)
export class StudentShowcasesController {
  constructor(
    private readonly service: ShowcasesService,
    private readonly applePurchases: ApplePurchasesService,
  ) {}

  /** iOS: o app terminou uma compra na App Store e manda a prova (JWS). */
  @Post('purchases/apple')
  applePurchase(@GetUser('id') userId: string, @Body() dto: ApplePurchaseDto) {
    return this.applePurchases.verifyAndGrant(userId, dto.jws);
  }

  @Get('mine')
  mine(@GetUser('id') userId: string) {
    return this.service.listMine(userId);
  }

  /** Upsell: vitrines publicadas que o aluno ainda NÃO possui (com CTA de compra). */
  @Get('available')
  available(@GetUser('id') userId: string, @GetUser('role') role: string) {
    return this.service.listAvailable(userId, role);
  }

  @Get('mine/:slug')
  detail(@GetUser('id') userId: string, @Param('slug') slug: string) {
    return this.service.findMineBySlug(userId, slug);
  }

  /** Upsell: índice de aulas de uma vitrine bloqueada (prévia antes do checkout). */
  @Get('available/:slug')
  availableDetail(@Param('slug') slug: string) {
    return this.service.findAvailableBySlug(slug);
  }
}
