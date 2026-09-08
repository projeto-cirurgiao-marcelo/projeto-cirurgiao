import Link from 'next/link';
import { GraduationCap, ArrowLeft, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Política de Privacidade - Projeto Cirurgião',
  description: 'Política de privacidade da plataforma Projeto Cirurgião',
};

const CONTACT_EMAIL = 'contato@projetocirurgiao.app';

/**
 * Política pública (sem login). É a URL declarada nas lojas (App Privacy da
 * Apple e Data Safety do Google) e linkada no perfil do app — manter o
 * conteúdo alinhado ao que o produto realmente faz: acesso por convite,
 * IA generativa (Vertex AI) sobre transcrições e mensagens, vídeo via
 * Cloudflare, autoexclusão de conta em Perfil.
 */
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
            <span className="font-bold text-lg">Projeto Cirurgião</span>
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao início
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
            <h1 className="text-3xl font-extrabold tracking-tight">Política de Privacidade</h1>
            <p className="text-sm text-muted-foreground">Última atualização: 8 de setembro de 2026</p>
          </div>
        </div>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-bold mb-3">1. Introdução</h2>
            <p className="text-muted-foreground leading-relaxed">
              A plataforma <strong className="text-foreground">Projeto Cirurgião</strong> tem o compromisso de proteger a privacidade e os dados pessoais de seus usuários. Esta Política de Privacidade descreve como coletamos, utilizamos, armazenamos e protegemos suas informações pessoais no site, no aplicativo para Android e iOS e nos serviços relacionados, em conformidade com a Lei Geral de Proteção de Dados (LGPD, Lei n. 13.709/2018).
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              O acesso à plataforma é liberado por convite. Não há cadastro aberto ao público: a conta é criada pela nossa equipe a partir do e-mail informado na contratação de um treinamento.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">2. Dados Coletados</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Coletamos os seguintes tipos de dados pessoais:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">Dados de cadastro:</strong> nome, e-mail e credenciais de acesso. A senha é gerenciada pelo Firebase Authentication e nunca é armazenada em texto legível.</li>
              <li><strong className="text-foreground">Dados de perfil:</strong> profissão, especializações, estado, cidade, foto e uma breve biografia, informados por você de forma opcional.</li>
              <li><strong className="text-foreground">Dados de uso:</strong> aulas assistidas, posição de reprodução, progresso nos módulos, respostas e resultados em quizzes, conquistas, pontos de experiência e sequências de estudo.</li>
              <li><strong className="text-foreground">Conteúdo gerado por você:</strong> anotações em aulas, favoritos, mensagens enviadas ao assistente de IA, perguntas à biblioteca e publicações no fórum.</li>
              <li><strong className="text-foreground">Dados técnicos:</strong> endereço IP, tipo de dispositivo e sistema operacional, versão do aplicativo e registros de acesso, usados para segurança e para o funcionamento do serviço.</li>
              <li><strong className="text-foreground">Dados de compra:</strong> a contratação de treinamentos é feita fora do aplicativo, por parceiros de pagamento. Recebemos deles apenas a confirmação da compra e o e-mail do comprador, para liberar o acesso. Não armazenamos dados de cartão.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">3. Finalidade do Tratamento</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Utilizamos seus dados pessoais para:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Criar e gerenciar sua conta e liberar os treinamentos contratados.</li>
              <li>Salvar e sincronizar seu progresso entre o site e o aplicativo.</li>
              <li>Gerar resumos, quizzes e respostas do assistente de IA sobre as aulas.</li>
              <li>Manter o fórum, a gamificação e o ranking entre alunos.</li>
              <li>Enviar comunicações sobre a plataforma e sobre os treinamentos que você contratou.</li>
              <li>Garantir a segurança do serviço, prevenir fraudes e uso indevido.</li>
              <li>Melhorar nossos serviços por meio de análises de uso agregadas.</li>
              <li>Cumprir obrigações legais e regulatórias.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">4. Inteligência Artificial</h2>
            <p className="text-muted-foreground leading-relaxed">
              O assistente de IA, os resumos automáticos e os quizzes usam modelos de linguagem hospedados na Google Cloud (Vertex AI). Para responder, enviamos ao modelo as suas mensagens, o contexto da aula (transcrição e resumo) e trechos da biblioteca. Esse conteúdo é processado apenas para gerar a resposta e não é usado pelo provedor para treinar modelos. As respostas do assistente têm caráter educacional e não substituem a avaliação clínica de um profissional.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">5. Compartilhamento de Dados</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Seus dados pessoais podem ser compartilhados com os seguintes operadores, apenas na medida necessária para prestar o serviço:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">Google Cloud Platform:</strong> hospedagem da aplicação e do banco de dados (região de São Paulo), autenticação (Firebase Authentication) e processamento de IA (Vertex AI).</li>
              <li><strong className="text-foreground">Cloudflare:</strong> armazenamento e entrega dos vídeos, legendas e materiais das aulas.</li>
              <li><strong className="text-foreground">Vercel:</strong> hospedagem do site.</li>
              <li><strong className="text-foreground">Parceiros de pagamento:</strong> processam a contratação dos treinamentos e nos informam a confirmação da compra.</li>
              <li><strong className="text-foreground">Autoridades:</strong> quando exigido por lei ou ordem judicial.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Não vendemos, alugamos ou compartilhamos seus dados pessoais com terceiros para fins de marketing. Alguns operadores podem processar dados fora do Brasil; nesses casos, o tratamento segue as garantias previstas na LGPD para transferência internacional.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">6. Armazenamento e Segurança</h2>
            <p className="text-muted-foreground leading-relaxed">
              Seus dados são armazenados com criptografia em trânsito (TLS) e em repouso. Adotamos medidas técnicas e organizacionais para proteger suas informações contra acesso não autorizado, perda, alteração ou destruição. O acesso aos dados é restrito a colaboradores autorizados que necessitem dessas informações para desempenhar suas funções, e as ações administrativas são registradas em trilha de auditoria.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">7. Seus Direitos (LGPD)</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Em conformidade com a LGPD, você tem direito a:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">Confirmação e acesso:</strong> saber se tratamos seus dados e acessar suas informações.</li>
              <li><strong className="text-foreground">Correção:</strong> corrigir dados incompletos ou desatualizados, diretamente em Perfil.</li>
              <li><strong className="text-foreground">Anonimização ou exclusão:</strong> excluir sua conta a qualquer momento (veja a seção 8).</li>
              <li><strong className="text-foreground">Portabilidade:</strong> solicitar uma cópia dos seus dados em formato estruturado.</li>
              <li><strong className="text-foreground">Revogação do consentimento:</strong> revogar o consentimento a qualquer momento.</li>
              <li><strong className="text-foreground">Oposição:</strong> se opor ao tratamento realizado sem seu consentimento.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">8. Exclusão de Conta</h2>
            <p className="text-muted-foreground leading-relaxed">
              Você pode excluir sua conta sozinho, sem precisar falar com o suporte:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-3">
              <li><strong className="text-foreground">No aplicativo:</strong> Perfil, opção &quot;Excluir minha conta&quot; no fim da tela.</li>
              <li><strong className="text-foreground">No site:</strong> Perfil, seção &quot;Excluir conta&quot;.</li>
              <li><strong className="text-foreground">Por e-mail:</strong> escreva para {CONTACT_EMAIL} a partir do e-mail cadastrado.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Ao confirmar, seus dados de identificação (nome, e-mail e perfil) são anonimizados imediatamente, as conversas com a IA, anotações e favoritos são apagados e o login é removido em todos os dispositivos. Registros necessários ao cumprimento de obrigações legais e fiscais e ao histórico do fórum permanecem apenas de forma anonimizada. A exclusão é permanente e não pode ser desfeita.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">9. Retenção de Dados</h2>
            <p className="text-muted-foreground leading-relaxed">
              Seus dados pessoais são mantidos enquanto a conta estiver ativa e pelo período necessário para cumprir as finalidades descritas nesta política. Após a exclusão da conta, os dados de identificação são anonimizados na hora; registros de compra e de auditoria podem ser mantidos por até 5 anos para cumprimento de obrigações legais e fiscais, após os quais são eliminados.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">10. Alterações nesta Política</h2>
            <p className="text-muted-foreground leading-relaxed">
              Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos você sobre alterações significativas por e-mail ou por aviso na plataforma. Recomendamos que você revise esta página regularmente.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">11. Contato</h2>
            <p className="text-muted-foreground leading-relaxed">
              Para exercer seus direitos ou esclarecer dúvidas sobre esta Política de Privacidade, entre em contato com o nosso encarregado de dados:
            </p>
            <div className="mt-3 p-4 rounded-lg bg-muted/50 border border-border">
              <p className="text-sm text-foreground font-medium">Projeto Cirurgião</p>
              <p className="text-sm text-muted-foreground">E-mail: {CONTACT_EMAIL}</p>
              <p className="text-sm text-muted-foreground">São Paulo, SP - Brasil</p>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-16">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Projeto Cirurgião. Todos os direitos reservados.</p>
          <div className="mt-2 space-x-4">
            <Link href="/terms" className="hover:text-foreground transition-colors">Termos de Uso</Link>
            <Link href="/cookies" className="hover:text-foreground transition-colors">Política de Cookies</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
