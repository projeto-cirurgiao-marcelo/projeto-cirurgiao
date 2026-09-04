import { Controller, Get, Param } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ShowcasesService } from './showcases.service';

/**
 * Lado PÚBLICO (sem auth): alimenta a página de ajuda do web
 * (`/ajuda?desbloquear=slug`), que é quem carrega o link do checkout. O app
 * mobile aponta pra essa página, nunca pro checkout — ver
 * ShowcasesService.findPublicBySlug. Só vitrines publicadas e à venda;
 * limite de requisições mais apertado por ser aberto.
 */
@Controller('showcases/public')
@Throttle({ short: { limit: 10, ttl: 1000 }, medium: { limit: 60, ttl: 60_000 } })
export class PublicShowcasesController {
  constructor(private readonly service: ShowcasesService) {}

  @Get()
  list() {
    return this.service.listPublic();
  }

  @Get(':slug')
  bySlug(@Param('slug') slug: string) {
    return this.service.findPublicBySlug(slug);
  }
}
