import Link from 'next/link';
import { GraduationCap, ArrowLeft, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Politica de Privacidade - Projeto Cirurgiao',
  description: 'Politica de privacidade da plataforma Projeto Cirurgiao',
};

export default function PrivacyPage() {
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
            <ShieldCheck className="h-6 w-6 text-[rgb(var(--primary-500))]" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Politica de Privacidade</h1>
            <p className="text-sm text-muted-foreground">Ultima atualizacao: Abril de 2026</p>
          </div>
        </div>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-bold mb-3">1. Introducao</h2>
            <p className="text-muted-foreground leading-relaxed">
              A plataforma <strong className="text-foreground">Projeto Cirurgiao</strong> tem o compromisso de proteger a privacidade e os dados pessoais de seus usuarios. Esta Politica de Privacidade descreve como coletamos, utilizamos, armazenamos e protegemos suas informacoes pessoais em conformidade com a Lei Geral de Protecao de Dados (LGPD - Lei n. 13.709/2018).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">2. Dados Coletados</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Coletamos os seguintes tipos de dados pessoais:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">Dados de cadastro:</strong> nome completo, e-mail, telefone e senha criptografada.</li>
              <li><strong className="text-foreground">Dados profissionais:</strong> formacao academica e area de atuacao em medicina veterinaria.</li>
              <li><strong className="text-foreground">Dados de uso:</strong> historico de cursos acessados, progresso em modulos, notas em quizzes e interacoes na plataforma.</li>
              <li><strong className="text-foreground">Dados de navegacao:</strong> endereco IP, tipo de navegador, paginas visitadas e tempo de permanencia.</li>
              <li><strong className="text-foreground">Dados de pagamento:</strong> informacoes de cobranca processadas por nossos parceiros de pagamento (nao armazenamos dados de cartao de credito).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">3. Finalidade do Tratamento</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Utilizamos seus dados pessoais para:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Criar e gerenciar sua conta na plataforma.</li>
              <li>Fornecer acesso aos cursos e conteudos educacionais contratados.</li>
              <li>Personalizar sua experiencia de aprendizado e recomendar conteudos relevantes.</li>
              <li>Emitir certificados de conclusao de cursos.</li>
              <li>Processar pagamentos e gerenciar assinaturas.</li>
              <li>Enviar comunicacoes sobre atualizacoes da plataforma, novos cursos e eventos.</li>
              <li>Melhorar nossos servicos por meio de analises de uso agregadas.</li>
              <li>Cumprir obrigacoes legais e regulatorias.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">4. Compartilhamento de Dados</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Seus dados pessoais podem ser compartilhados com:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">Processadores de pagamento:</strong> para viabilizar transacoes financeiras de forma segura.</li>
              <li><strong className="text-foreground">Provedores de infraestrutura:</strong> servicos de hospedagem e armazenamento em nuvem (Google Cloud Platform).</li>
              <li><strong className="text-foreground">Ferramentas de analytics:</strong> para analise agregada de uso da plataforma.</li>
              <li><strong className="text-foreground">Autoridades legais:</strong> quando exigido por lei ou ordem judicial.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Nao vendemos, alugamos ou compartilhamos seus dados pessoais com terceiros para fins de marketing.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">5. Armazenamento e Seguranca</h2>
            <p className="text-muted-foreground leading-relaxed">
              Seus dados sao armazenados em servidores seguros com criptografia em transito (TLS/SSL) e em repouso. Adotamos medidas tecnicas e organizacionais para proteger suas informacoes contra acesso nao autorizado, perda, alteracao ou destruicao. O acesso aos dados e restrito a colaboradores autorizados que necessitem dessas informacoes para desempenhar suas funcoes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">6. Seus Direitos (LGPD)</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Em conformidade com a LGPD, voce tem direito a:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">Confirmacao e acesso:</strong> saber se tratamos seus dados e acessar suas informacoes.</li>
              <li><strong className="text-foreground">Correcao:</strong> solicitar a correcao de dados incompletos ou desatualizados.</li>
              <li><strong className="text-foreground">Anonimizacao ou exclusao:</strong> solicitar a anonimizacao ou exclusao de dados desnecessarios.</li>
              <li><strong className="text-foreground">Portabilidade:</strong> solicitar a transferencia de seus dados a outro fornecedor.</li>
              <li><strong className="text-foreground">Revogacao do consentimento:</strong> revogar o consentimento a qualquer momento.</li>
              <li><strong className="text-foreground">Oposicao:</strong> se opor ao tratamento de dados quando realizado sem seu consentimento.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">7. Retencao de Dados</h2>
            <p className="text-muted-foreground leading-relaxed">
              Seus dados pessoais serao mantidos pelo periodo necessario para cumprir as finalidades descritas nesta politica, ou conforme exigido por lei. Apos o encerramento da sua conta, manteremos seus dados por ate 5 anos para cumprimento de obrigacoes legais e fiscais, apos os quais serao anonimizados ou excluidos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">8. Alteracoes nesta Politica</h2>
            <p className="text-muted-foreground leading-relaxed">
              Reservamo-nos o direito de atualizar esta Politica de Privacidade periodicamente. Notificaremos voce sobre alteracoes significativas por e-mail ou por aviso na plataforma. Recomendamos que voce revise esta pagina regularmente.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">9. Contato</h2>
            <p className="text-muted-foreground leading-relaxed">
              Para exercer seus direitos ou esclarecer duvidas sobre esta Politica de Privacidade, entre em contato conosco:
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
