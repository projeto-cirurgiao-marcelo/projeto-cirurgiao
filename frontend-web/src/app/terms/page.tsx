import Link from 'next/link';
import { GraduationCap, ArrowLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Termos de Servico - Projeto Cirurgiao',
  description: 'Termos de servico da plataforma Projeto Cirurgiao',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[rgb(var(--primary-500))] text-white">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span className="font-bold text-lg">Projeto Cirurgiao</span>
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao inicio
            </Link>
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[rgb(var(--primary-500))]/10">
            <FileText className="h-6 w-6 text-[rgb(var(--primary-500))]" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Termos de Servico</h1>
            <p className="text-sm text-muted-foreground">Ultima atualizacao: Abril de 2026</p>
          </div>
        </div>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-bold mb-3">1. Aceitacao dos Termos</h2>
            <p className="text-muted-foreground leading-relaxed">
              Ao acessar e utilizar a plataforma <strong className="text-foreground">Projeto Cirurgiao</strong>, voce concorda com estes Termos de Servico. Caso nao concorde com alguma disposicao, solicitamos que nao utilize a plataforma. O uso continuado da plataforma apos quaisquer alteracoes nestes termos constitui aceitacao das modificacoes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">2. Descricao do Servico</h2>
            <p className="text-muted-foreground leading-relaxed">
              O Projeto Cirurgiao e uma plataforma educacional online dedicada ao ensino de cirurgia veterinaria. Oferecemos cursos em video, materiais didaticos, quizzes, forum de discussao, sistema de gamificacao e biblioteca com inteligencia artificial para auxiliar no aprendizado de medicos veterinarios.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">3. Cadastro e Conta</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Para acessar os conteudos da plataforma, e necessario criar uma conta com informacoes verdadeiras e atualizadas.</li>
              <li>Voce e responsavel por manter a confidencialidade de suas credenciais de acesso (e-mail e senha).</li>
              <li>Cada conta e pessoal e intransferivel. O compartilhamento de credenciais e estritamente proibido.</li>
              <li>Voce deve notificar imediatamente a plataforma sobre qualquer uso nao autorizado de sua conta.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">4. Conteudo e Propriedade Intelectual</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Todo o conteudo disponivel na plataforma (videos, textos, imagens, materiais didaticos, quizzes) e protegido por direitos autorais.</li>
              <li>E concedida ao usuario uma licenca limitada, nao exclusiva e nao transferivel para uso pessoal e educacional.</li>
              <li>E expressamente proibido copiar, reproduzir, distribuir, gravar, transmitir ou compartilhar qualquer conteudo da plataforma sem autorizacao previa por escrito.</li>
              <li>A violacao dos direitos de propriedade intelectual podera resultar em suspensao ou cancelamento da conta, alem de medidas legais cabiveis.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">5. Pagamentos e Assinaturas</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>O acesso a determinados cursos e conteudos pode requerer pagamento de assinatura ou compra avulsa.</li>
              <li>Os precos sao apresentados em Reais (BRL) e podem ser alterados com aviso previo de 30 dias.</li>
              <li>O processamento de pagamentos e realizado por parceiros terceirizados em ambiente seguro.</li>
              <li>Reembolsos serao concedidos conforme o Codigo de Defesa do Consumidor, no prazo de 7 dias apos a compra, desde que nao tenha havido acesso substancial ao conteudo (mais de 30% do curso).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">6. Regras de Uso</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Ao utilizar a plataforma, voce concorda em nao:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Utilizar a plataforma para fins ilegais ou nao autorizados.</li>
              <li>Compartilhar conteudos ofensivos, difamatorios ou inadequados no forum e demais areas interativas.</li>
              <li>Tentar acessar areas restritas da plataforma ou interferir em seu funcionamento.</li>
              <li>Utilizar ferramentas automatizadas (bots, scrapers) para acessar a plataforma.</li>
              <li>Fazer-se passar por outra pessoa ou profissional.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">7. Certificados</h2>
            <p className="text-muted-foreground leading-relaxed">
              A plataforma podera emitir certificados de conclusao para cursos que atendam aos criterios estabelecidos. Os certificados sao emitidos em formato digital e atestam a participacao e conclusao do conteudo programatico. Os certificados nao substituem diplomas de graduacao ou pos-graduacao reconhecidos pelo MEC.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">8. Limitacao de Responsabilidade</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>O conteudo educacional e fornecido com fins de aprendizado e nao substitui a orientacao profissional direta ou supervisao clinica.</li>
              <li>A plataforma nao se responsabiliza por decisoes clinicas ou cirurgicas tomadas com base exclusiva no conteudo dos cursos.</li>
              <li>Nao garantimos disponibilidade ininterrupta da plataforma, podendo haver interrupcoes para manutencao programada.</li>
              <li>A responsabilidade da plataforma esta limitada ao valor pago pelo usuario nos ultimos 12 meses.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">9. Suspensao e Cancelamento</h2>
            <p className="text-muted-foreground leading-relaxed">
              Reservamo-nos o direito de suspender ou cancelar contas que violem estes Termos de Servico, sem aviso previo em casos graves. Em caso de cancelamento por violacao, nao havera direito a reembolso. O usuario pode cancelar sua conta a qualquer momento atraves das configuracoes de perfil ou entrando em contato com o suporte.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">10. Alteracoes nos Termos</h2>
            <p className="text-muted-foreground leading-relaxed">
              Podemos atualizar estes Termos de Servico periodicamente. Alteracoes significativas serao comunicadas por e-mail ou notificacao na plataforma com antecedencia minima de 15 dias. O uso continuado da plataforma apos a entrada em vigor das alteracoes constitui aceitacao dos novos termos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">11. Legislacao Aplicavel e Foro</h2>
            <p className="text-muted-foreground leading-relaxed">
              Estes Termos de Servico sao regidos pela legislacao brasileira. Fica eleito o foro da comarca de Sao Paulo, Estado de Sao Paulo, para dirimir quaisquer controversias decorrentes destes termos, com renuncia expressa a qualquer outro, por mais privilegiado que seja.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">12. Contato</h2>
            <p className="text-muted-foreground leading-relaxed">
              Para duvidas sobre estes Termos de Servico, entre em contato:
            </p>
            <div className="mt-3 p-4 rounded-lg bg-muted/50 border border-border">
              <p className="text-sm text-foreground font-medium">Projeto Cirurgiao</p>
              <p className="text-sm text-muted-foreground">E-mail: contato@projetocirurgiao.com.br</p>
              <p className="text-sm text-muted-foreground">Sao Paulo, SP - Brasil</p>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-16">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Projeto Cirurgiao. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}
