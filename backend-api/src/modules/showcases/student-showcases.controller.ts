import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../firebase/guards/firebase-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { ShowcasesService } from './showcases.service';

/**
 * Lado do aluno: "o que é meu". Só devolve vitrines com entitlement ativo
 * do próprio usuário — catálogo/oferta de vitrines não vendidas fica fora
 * de escopo (a venda acontece no TheMembers).
 */
@Controller('showcases')
@UseGuards(FirebaseAuthGuard)
export class StudentShowcasesController {
  constructor(private readonly service: ShowcasesService) {}

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
}
