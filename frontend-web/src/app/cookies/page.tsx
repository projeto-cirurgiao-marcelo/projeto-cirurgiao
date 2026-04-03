import Link from 'next/link';
import { GraduationCap, ArrowLeft, Cookie } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Politica de Cookies - Projeto Cirurgiao',
  description: 'Politica de cookies e instrucoes para exclusao na plataforma Projeto Cirurgiao',
};

export default function CookiesPage() {
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
            <Cookie className="h-6 w-6 text-[rgb(var(--primary-500))]" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Politica de Cookies</h1>
            <p className="text-sm text-muted-foreground">Ultima atualizacao: Abril de 2026</p>
          </div>
        </div>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-bold mb-3">1. O que sao Cookies?</h2>
            <p className="text-muted-foreground leading-relaxed">
              Cookies sao pequenos arquivos de texto armazenados no seu dispositivo (computador, tablet ou smartphone) quando voce visita um site. Eles permitem que o site reconheca seu dispositivo e armazene informacoes sobre suas preferencias ou acoes anteriores.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">2. Cookies que Utilizamos</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              A plataforma <strong className="text-foreground">Projeto Cirurgiao</strong> utiliza os seguintes tipos de cookies:
            </p>

            <div className="space-y-4">
              <div className="p-4 rounded-lg border border-border bg-muted/30">
                <h3 className="font-semibold text-foreground mb-2">Cookies Essenciais</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Necessarios para o funcionamento basico da plataforma. Nao podem ser desativados.
                </p>
                <ul className="list-disc pl-6 space-y-1 text-sm text-muted-foreground">
                  <li><strong className="text-foreground">auth-session:</strong> Mantem sua sessao de login ativa enquanto navega pela plataforma.</li>
                  <li><strong className="text-foreground">csrf-token:</strong> Protege contra ataques de falsificacao de requisicoes.</li>
                  <li><strong className="text-foreground">cookie-consent:</strong> Armazena sua preferencia de consentimento de cookies.</li>
                </ul>
              </div>

              <div className="p-4 rounded-lg border border-border bg-muted/30">
                <h3 className="font-semibold text-foreground mb-2">Cookies de Funcionalidade</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Permitem que a plataforma lembre suas preferencias para uma experiencia personalizada.
                </p>
                <ul className="list-disc pl-6 space-y-1 text-sm text-muted-foreground">
                  <li><strong className="text-foreground">theme-preference:</strong> Armazena sua preferencia de tema (claro/escuro).</li>
                  <li><strong className="text-foreground">sidebar-state:</strong> Lembra o estado da barra lateral (aberta/fechada).</li>
                  <li><strong className="text-foreground">video-quality:</strong> Salva sua preferencia de qualidade de video.</li>
                </ul>
              </div>

              <div className="p-4 rounded-lg border border-border bg-muted/30">
                <h3 className="font-semibold text-foreground mb-2">Cookies de Desempenho e Analiticos</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Nos ajudam a entender como os usuarios interagem com a plataforma para melhorar a experiencia.
                </p>
                <ul className="list-disc pl-6 space-y-1 text-sm text-muted-foreground">
                  <li><strong className="text-foreground">_ga / _gid:</strong> Google Analytics - coletam informacoes anonimas sobre navegacao.</li>
                  <li><strong className="text-foreground">_gat:</strong> Google Analytics - utilizado para limitar a taxa de requisicoes.</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">3. Como Excluir Cookies</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Voce pode excluir os cookies armazenados no seu navegador a qualquer momento. Abaixo estao as instrucoes para os principais navegadores:
            </p>

            <div className="space-y-4">
              <div className="p-4 rounded-lg border border-border bg-muted/30">
                <h3 className="font-semibold text-foreground mb-2">Google Chrome</h3>
                <ol className="list-decimal pl-6 space-y-1 text-sm text-muted-foreground">
                  <li>Clique no menu (tres pontos) no canto superior direito.</li>
                  <li>Acesse <strong className="text-foreground">Configuracoes</strong> &gt; <strong className="text-foreground">Privacidade e seguranca</strong>.</li>
                  <li>Clique em <strong className="text-foreground">Cookies e outros dados de sites</strong>.</li>
                  <li>Selecione <strong className="text-foreground">Ver todos os cookies e dados de sites</strong>.</li>
                  <li>Pesquise por &quot;projetocirurgiao&quot; e remova os cookies desejados.</li>
                </ol>
              </div>

              <div className="p-4 rounded-lg border border-border bg-muted/30">
                <h3 className="font-semibold text-foreground mb-2">Mozilla Firefox</h3>
                <ol className="list-decimal pl-6 space-y-1 text-sm text-muted-foreground">
                  <li>Clique no menu (tres linhas) no canto superior direito.</li>
                  <li>Acesse <strong className="text-foreground">Configuracoes</strong> &gt; <strong className="text-foreground">Privacidade e Seguranca</strong>.</li>
                  <li>Na secao <strong className="text-foreground">Cookies e dados de sites</strong>, clique em <strong className="text-foreground">Gerenciar dados</strong>.</li>
                  <li>Pesquise por &quot;projetocirurgiao&quot; e clique em <strong className="text-foreground">Remover selecionados</strong>.</li>
                </ol>
              </div>

              <div className="p-4 rounded-lg border border-border bg-muted/30">
                <h3 className="font-semibold text-foreground mb-2">Microsoft Edge</h3>
                <ol className="list-decimal pl-6 space-y-1 text-sm text-muted-foreground">
                  <li>Clique no menu (tres pontos) no canto superior direito.</li>
                  <li>Acesse <strong className="text-foreground">Configuracoes</strong> &gt; <strong className="text-foreground">Cookies e permissoes de site</strong>.</li>
                  <li>Clique em <strong className="text-foreground">Gerenciar e excluir cookies e dados de sites</strong>.</li>
                  <li>Clique em <strong className="text-foreground">Ver todos os cookies e dados de sites</strong>.</li>
                  <li>Pesquise e remova os cookies do Projeto Cirurgiao.</li>
                </ol>
              </div>

              <div className="p-4 rounded-lg border border-border bg-muted/30">
                <h3 className="font-semibold text-foreground mb-2">Safari (macOS / iOS)</h3>
                <ol className="list-decimal pl-6 space-y-1 text-sm text-muted-foreground">
                  <li>Acesse <strong className="text-foreground">Safari</strong> &gt; <strong className="text-foreground">Preferencias</strong> (ou Ajustes no iOS).</li>
                  <li>Va ate a aba <strong className="text-foreground">Privacidade</strong>.</li>
                  <li>Clique em <strong className="text-foreground">Gerenciar Dados de Sites</strong>.</li>
                  <li>Pesquise por &quot;projetocirurgiao&quot; e clique em <strong className="text-foreground">Remover</strong>.</li>
                </ol>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">4. Consequencias da Exclusao de Cookies</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Ao excluir os cookies da plataforma, esteja ciente de que:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Voce sera desconectado da plataforma e precisara fazer login novamente.</li>
              <li>Suas preferencias de tema, qualidade de video e outras configuracoes serao redefinidas.</li>
              <li>O estado da barra lateral e outras personalizacoes de interface voltarao ao padrao.</li>
              <li>A exclusao nao afeta seus dados de conta, progresso em cursos ou certificados, pois estes sao armazenados em nossos servidores.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">5. Cookies de Terceiros</h2>
            <p className="text-muted-foreground leading-relaxed">
              Alguns servicos de terceiros integrados a plataforma podem configurar seus proprios cookies. Nao temos controle sobre esses cookies. Recomendamos consultar as politicas de privacidade desses servicos para mais informacoes sobre como eles tratam seus dados. Os principais servicos de terceiros que utilizamos incluem Google Analytics e provedores de processamento de pagamento.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">6. Atualizacoes desta Politica</h2>
            <p className="text-muted-foreground leading-relaxed">
              Esta Politica de Cookies pode ser atualizada periodicamente para refletir mudancas em nossas praticas ou por motivos legais. Alteracoes significativas serao comunicadas na plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">7. Contato</h2>
            <p className="text-muted-foreground leading-relaxed">
              Para duvidas sobre cookies ou sobre esta politica, entre em contato:
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
