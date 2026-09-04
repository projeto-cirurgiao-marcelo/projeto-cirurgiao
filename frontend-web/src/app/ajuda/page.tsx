'use client';

/**
 * Central de Ajuda — pública (sem login).
 *
 * É também a "página de destino" do app mobile quando o aluno tenta abrir
 * um curso bloqueado: o app chega em `/ajuda?desbloquear=<slug>` e esta
 * página abre já na pergunta "Como desbloquear mais cursos?", com o link do
 * checkout daquela vitrine. O app nunca aponta pro checkout diretamente
 * (padrão Spotify / App Store 3.1.1) — quem carrega a URL de compra é esta
 * página, a partir de GET /showcases/public/:slug.
 *
 * `?embed=1`: esconde cabeçalho e rodapé do site (uso dentro do WebView).
 */

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { GraduationCap, ArrowLeft, LifeBuoy, ExternalLink, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { showcasesService } from '@/lib/api/showcases.service';
import type { PublicShowcase, PublicShowcases } from '@/lib/types/showcase.types';
import { logger } from '@/lib/logger';

const UNLOCK_ITEM = 'desbloquear';

interface FaqItem {
  id: string;
  category: string;
  question: string;
  answer: string;
}

// Mesmo conteúdo da tela de FAQ do app (mobile-app/app/profile/faq.tsx).
const FAQ: FaqItem[] = [
  {
    id: 'conta-criar',
    category: 'Conta e acesso',
    question: 'Como faço para criar uma conta?',
    answer:
      'O acesso ao Projeto Cirurgião é por convite. Se você recebeu um link de registro, utilize-o para criar sua conta com e-mail e senha. Em caso de dúvida, fale com o suporte.',
  },
  {
    id: 'conta-senha',
    category: 'Conta e acesso',
    question: 'Esqueci minha senha, como recuperar?',
    answer:
      'Na tela de login, clique em "Esqueci minha senha". Informe o e-mail cadastrado e enviaremos um link para redefinição. Verifique também a pasta de spam.',
  },
  {
    id: 'conta-app-site',
    category: 'Conta e acesso',
    question: 'Posso usar a mesma conta no app e no site?',
    answer:
      'Sim. Sua conta é única e funciona no aplicativo e na versão web. O progresso é sincronizado automaticamente entre as plataformas.',
  },
  {
    id: 'cursos-progresso',
    category: 'Cursos e aulas',
    question: 'Meu progresso é salvo automaticamente?',
    answer:
      'Sim. O progresso é salvo a cada poucos segundos enquanto você assiste. Ao retornar, a aula continua de onde você parou.',
  },
  {
    id: 'cursos-quiz',
    category: 'Cursos e aulas',
    question: 'O que é o Quiz de cada aula?',
    answer:
      'Cada aula pode ter um quiz gerado por inteligência artificial a partir do conteúdo do vídeo. Cada tentativa gera perguntas diferentes, para testar seus conhecimentos de forma contínua.',
  },
  {
    id: 'cursos-resumo',
    category: 'Cursos e aulas',
    question: 'Como funcionam os resumos por IA?',
    answer:
      'Na aba "Resumo" de cada aula, a IA analisa a transcrição do vídeo e gera um resumo em texto. É possível gerar até 3 versões diferentes por aula.',
  },
  {
    id: 'mentor',
    category: 'Mentor IA',
    question: 'O que é o Mentor IA?',
    answer:
      'O Mentor IA é um assistente que responde dúvidas sobre o conteúdo das aulas. Ele usa as transcrições dos vídeos para dar respostas contextualizadas e com referência ao trecho da aula.',
  },
  {
    id: 'forum',
    category: 'Fórum',
    question: 'Como faço uma pergunta no fórum?',
    answer:
      'Acesse o Fórum, escolha a categoria adequada e crie um novo tópico. Você pode vincular a pergunta a um curso e a uma aula específica para ajudar outros alunos a encontrá-la.',
  },
  {
    id: 'tecnico-offline',
    category: 'Técnico',
    question: 'O app funciona offline?',
    answer:
      'No momento é necessária conexão com a internet para assistir às aulas e usar os recursos. O download para visualização offline está previsto para uma atualização futura.',
  },
];

function UnlockAnswer({
  slug,
}: {
  slug: string | null;
}) {
  const [showcase, setShowcase] = useState<PublicShowcase | null>(null);
  const [all, setAll] = useState<PublicShowcases['showcases']>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    const load = async () => {
      try {
        if (slug) {
          const s = await showcasesService.publicShowcase(slug);
          if (!cancelled) setShowcase(s);
        } else {
          const list = await showcasesService.publicShowcases();
          if (!cancelled) setAll(list.showcases);
        }
      } catch (err) {
        logger.error('Erro ao carregar vitrine da ajuda:', err);
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return (
    <div className="space-y-4 text-muted-foreground leading-relaxed">
      <p>
        Os cursos do Projeto Cirurgião são vendidos separadamente. Ao adquirir um curso, o acesso
        é liberado automaticamente na sua conta, no app e no site, em poucos minutos após a
        confirmação do pagamento, usando o mesmo e-mail do cadastro.
      </p>

      {loading ? (
        <div className="h-24 rounded-lg bg-muted animate-pulse" />
      ) : slug && showcase ? (
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 flex gap-4 items-start">
          {showcase.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={showcase.thumbnail}
              alt=""
              className="hidden sm:block w-28 h-16 rounded-lg object-cover shrink-0"
            />
          ) : (
            <div className="hidden sm:flex w-28 h-16 rounded-lg bg-muted items-center justify-center shrink-0">
              <Lock className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
              Você tentou acessar
            </p>
            <p className="font-semibold text-foreground text-base leading-tight">
              {showcase.title}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {showcase.videoCount} aula{showcase.videoCount !== 1 ? 's' : ''}
            </p>
            <Button className="mt-3" asChild>
              <a href={showcase.checkoutUrl} target="_blank" rel="noopener noreferrer">
                Acessar a página de compra
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      ) : slug && notFound ? (
        <p className="rounded-lg border border-border bg-muted/40 p-4 text-sm">
          Este curso ainda não está disponível para compra. Fale com o suporte para saber quando
          ele será liberado.
        </p>
      ) : all.length > 0 ? (
        <div>
          <p className="mb-2">Cursos disponíveis para compra:</p>
          <ul className="space-y-2">
            {all.map((s) => (
              <li key={s.id}>
                <a
                  href={s.checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[rgb(var(--primary-600))] font-medium hover:underline"
                >
                  {s.title}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm">
          Não foi possível carregar a lista de cursos agora. Tente novamente em instantes.
        </p>
      )}

      <p className="text-sm">
        Já comprou e o acesso não apareceu? Confira se usou o mesmo e-mail da sua conta e, se
        precisar, fale com o suporte.
      </p>
    </div>
  );
}

function HelpContent() {
  const params = useSearchParams();
  const slug = params.get(UNLOCK_ITEM);
  const embed = params.get('embed') === '1';

  const categories = useMemo(() => [...new Set(FAQ.map((f) => f.category))], []);
  // Com ?desbloquear=slug, a pergunta de compra abre expandida e vai pro topo.
  const defaultOpen = slug ? [UNLOCK_ITEM] : [];

  const unlockItem = (
    <AccordionItem value={UNLOCK_ITEM} className="border rounded-xl px-4 bg-card">
      <AccordionTrigger className="text-left text-base font-semibold hover:no-underline">
        Como desbloquear mais cursos?
      </AccordionTrigger>
      <AccordionContent>
        <UnlockAnswer slug={slug} />
      </AccordionContent>
    </AccordionItem>
  );

  return (
    <div className="min-h-screen bg-background">
      {!embed && (
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
      )}

      <main className={embed ? 'px-4 py-5 max-w-3xl mx-auto' : 'container mx-auto px-4 py-12 max-w-3xl'}>
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[rgb(var(--primary-500))]/10">
            <LifeBuoy className="h-6 w-6 text-[rgb(var(--primary-500))]" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Central de Ajuda</h1>
            <p className="text-sm text-muted-foreground">Perguntas frequentes sobre a plataforma</p>
          </div>
        </div>

        <Accordion type="multiple" defaultValue={defaultOpen} className="space-y-3">
          {slug && unlockItem}

          {categories.map((category) => (
            <section key={category} className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pt-4">
                {category}
              </h2>
              {FAQ.filter((f) => f.category === category).map((item) => (
                <AccordionItem key={item.id} value={item.id} className="border rounded-xl px-4 bg-card">
                  <AccordionTrigger className="text-left text-base font-semibold hover:no-underline">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
              {category === 'Cursos e aulas' && !slug && unlockItem}
            </section>
          ))}
        </Accordion>

        {!embed && (
          <p className="mt-10 text-sm text-muted-foreground">
            Não encontrou o que procurava?{' '}
            <a
              href="mailto:contato@projetocirurgiao.app"
              className="text-[rgb(var(--primary-600))] font-medium hover:underline"
            >
              Fale com o suporte
            </a>
            .
          </p>
        )}
      </main>
    </div>
  );
}

/** `useSearchParams` exige Suspense no App Router (Next 15). */
export default function HelpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <HelpContent />
    </Suspense>
  );
}
