'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  AtlasButton,
  AtlasSynthesisCard,
  AtlasSynthesisCardEmpty,
  AtlasSynthesisCardSkeleton,
} from '@/components/atlas';
import {
  FileText,
  Download,
  Pencil,
  Trash2,
  Loader2,
  Eye,
  Save,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { atlasToast } from '@/components/atlas';
import { logger } from '@/lib/logger';
import { formatMarkdown } from '@/lib/markdown';
import { MarkdownEditor } from '@/components/ui/markdown-editor';
import {
  summariesService,
  VideoSummary,
} from '@/lib/api/summaries.service';

interface VideoSummariesProps {
  videoId: string;
  hasTranscript: boolean;
}

export function VideoSummaries({ videoId, hasTranscript }: VideoSummariesProps) {
  const [summaries, setSummaries] = useState<VideoSummary[]>([]);
  const [remainingGenerations, setRemainingGenerations] = useState(3);
  const [maxAllowed, setMaxAllowed] = useState(3);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedSummary, setSelectedSummary] = useState<VideoSummary | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showVersions, setShowVersions] = useState(false);

  useEffect(() => {
    loadSummaries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  const loadSummaries = async () => {
    try {
      setIsLoading(true);
      const response = await summariesService.listSummaries(videoId);
      setSummaries(response.summaries);
      setRemainingGenerations(response.remainingGenerations);
      setMaxAllowed(response.maxAllowed);
    } catch (error) {
      logger.error('Erro ao carregar resumos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!hasTranscript) {
      atlasToast.error('Sem transcrição', {
        description:
          'Aguarde a geração da legenda do vídeo para criar resumos com IA.',
      });
      return;
    }

    if (remainingGenerations <= 0) {
      atlasToast.error('Limite atingido', {
        description:
          'Você atingiu o limite de resumos para este vídeo.',
      });
      return;
    }

    try {
      setIsGenerating(true);
      const loadingId = atlasToast.loading('Gerando síntese com IA…', {
        description: 'Isso pode levar alguns segundos.',
      });

      const newSummary = await summariesService.generateSummary(videoId);

      setSummaries((prev) => [...prev, newSummary]);
      setRemainingGenerations(newSummary.remainingGenerations);

      atlasToast.dismiss(loadingId);
      // Sem success toast — síntese aparece imediato no card (feedback inline silencioso, nível 0)
    } catch (error: any) {
      logger.error('Erro ao gerar resumo:', error);
      // Mensagem do backend: 400 inline (axios) ou JobFailedError (modo fila).
      // Cobre o caso de resumo incompleto ("nenhuma geração foi consumida").
      const backendMessage =
        error.response?.data?.message ??
        (error.isAxiosError ? undefined : error.message);
      atlasToast.error('Falha ao gerar síntese', {
        description: backendMessage || 'Tente novamente em alguns segundos.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleViewSummary = (summary: VideoSummary) => {
    setSelectedSummary(summary);
    setEditContent(summary.content);
    setIsEditMode(false);
    setIsViewModalOpen(true);
  };

  const handleEditSummary = () => {
    if (selectedSummary) {
      setEditContent(selectedSummary.content);
      setIsEditMode(true);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedSummary) return;

    try {
      setIsSaving(true);
      const updated = await summariesService.updateSummary(
        videoId,
        selectedSummary.id,
        editContent,
      );

      setSummaries((prev) =>
        prev.map((s) => (s.id === updated.id ? updated : s)),
      );
      setSelectedSummary(updated);
      setIsEditMode(false);
      // Sem toast — modal já mostra conteúdo atualizado (feedback inline)
    } catch (error) {
      logger.error('Erro ao salvar resumo:', error);
      atlasToast.error('Falha ao salvar alterações');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = async (summary: VideoSummary) => {
    try {
      // Import dinamico: a lib de PDF (@react-pdf/renderer) so entra no bundle
      // quando o aluno realmente exporta.
      const { generateSummaryPdfBlob } = await import('@/lib/summary-pdf');

      // Titulo = primeiro heading `#` do conteudo, sem simbolos; fallback generico.
      const titleMatch = summary.content.match(/^#\s+(.+)$/m);
      const title = titleMatch
        ? titleMatch[1].replace(/[*_`#]/g, '').trim()
        : 'Resumo da aula';

      const blob = await generateSummaryPdfBlob(summary.content, title);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `resumo-${summary.version}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      // Sem toast — browser já indica download
    } catch (error) {
      logger.error('Erro ao exportar resumo em PDF:', error);
      atlasToast.error('Falha ao gerar PDF');
    }
  };

  const handleDelete = async (summary: VideoSummary) => {
    if (!confirm('Tem certeza que deseja excluir este resumo?')) return;

    try {
      await summariesService.deleteSummary(videoId, summary.id);
      setSummaries((prev) => prev.filter((s) => s.id !== summary.id));
      setRemainingGenerations((prev) => prev + 1);
      // Sem toast — item desapareceu da lista (feedback inline)

      if (selectedSummary?.id === summary.id) {
        setIsViewModalOpen(false);
        setSelectedSummary(null);
      }
    } catch (error) {
      logger.error('Erro ao excluir resumo:', error);
      atlasToast.error('Falha ao excluir resumo');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return <AtlasSynthesisCardSkeleton />;
  }

  // Sem síntese ainda
  if (summaries.length === 0) {
    const blocked = !hasTranscript || remainingGenerations <= 0;
    let disabledReason: string | undefined;
    if (!hasTranscript) {
      disabledReason =
        'Este vídeo ainda não possui transcrição. Aguarde a geração da legenda para criar resumos.';
    } else if (remainingGenerations <= 0) {
      disabledReason = `Você já atingiu o limite de ${maxAllowed} resumos para este vídeo.`;
    }

    return (
      <AtlasSynthesisCardEmpty
        onGenerate={handleGenerateSummary}
        generating={isGenerating}
        disabled={blocked}
        disabledReason={disabledReason}
        hint={
          !blocked
            ? `${remainingGenerations} disponíveis · IA aplica suas anotações`
            : undefined
        }
      />
    );
  }

  // Tem ao menos uma síntese — exibe a mais recente
  const latest = summaries[summaries.length - 1];
  const previousVersions = summaries.slice(0, -1);
  const usageLabel = `${summaries.length} / ${maxAllowed} usados`;
  const updatedLabel = `Atualizado · ${formatDate(latest.createdAt)}`;

  return (
    <div className="space-y-3">
      <AtlasSynthesisCard
        usageLabel={usageLabel}
        updatedLabel={updatedLabel}
        onExport={() => handleDownload(latest)}
        onRegenerate={
          remainingGenerations > 0 && hasTranscript
            ? handleGenerateSummary
            : undefined
        }
        busy={isGenerating}
        extraActions={
          <AtlasButton
            variant="ghost"
            size="sm"
            onClick={() => handleViewSummary(latest)}
          >
            <Eye strokeWidth={1.5} />
            Editar
          </AtlasButton>
        }
      >
        <div
          className="text-sm leading-relaxed text-atlas-ink-2 [&_h4]:font-serif [&_h4]:font-semibold [&_h4]:text-atlas-ink [&_h4]:text-[0.95rem] [&_h4]:mt-3 [&_h4]:mb-1 [&_h5]:font-serif [&_h5]:font-semibold [&_h5]:text-atlas-ink [&_h5]:text-[0.85rem] [&_h5]:mt-2.5 [&_h5]:mb-1 [&_p]:my-1.5 [&_ul]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-0.5 [&_strong]:font-semibold [&_strong]:text-atlas-ink"
          dangerouslySetInnerHTML={{ __html: formatMarkdown(latest.content) }}
        />
      </AtlasSynthesisCard>

      {previousVersions.length > 0 && (
        <div className="rounded-md border border-atlas-line bg-atlas-surface overflow-hidden">
          <button
            type="button"
            onClick={() => setShowVersions((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-atlas-surface-2 transition-colors"
          >
            <span className="atlas-caps text-atlas-muted">
              {previousVersions.length} versão{previousVersions.length > 1 ? 'ões' : ''} anterior{previousVersions.length > 1 ? 'es' : ''}
            </span>
            {showVersions ? (
              <ChevronUp className="size-3.5 text-atlas-muted" strokeWidth={1.75} />
            ) : (
              <ChevronDown className="size-3.5 text-atlas-muted" strokeWidth={1.75} />
            )}
          </button>
          {showVersions && (
            <ul className="border-t border-atlas-line divide-y divide-atlas-line">
              {previousVersions.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between px-5 py-3 hover:bg-atlas-surface-2 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText
                      className="size-3.5 text-atlas-muted-2 shrink-0"
                      strokeWidth={1.5}
                    />
                    <div className="min-w-0">
                      <div className="text-[13px] text-atlas-ink">
                        Resumo #{s.version}
                      </div>
                      <div className="atlas-mono text-[10.5px] text-atlas-muted">
                        {formatDate(s.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <AtlasButton
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleViewSummary(s)}
                      title="Visualizar"
                    >
                      <Eye strokeWidth={1.5} />
                    </AtlasButton>
                    <AtlasButton
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDownload(s)}
                      title="Baixar PDF"
                    >
                      <Download strokeWidth={1.5} />
                    </AtlasButton>
                    <AtlasButton
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDelete(s)}
                      title="Excluir"
                      className="text-atlas-accent hover:text-atlas-accent"
                    >
                      <Trash2 strokeWidth={1.5} />
                    </AtlasButton>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Modal de visualização/edição — mantido shadcn (out of scope) */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-serif font-medium">
              <FileText className="h-5 w-5" strokeWidth={1.5} />
              Resumo #{selectedSummary?.version}
              {isEditMode && (
                <span className="text-sm font-normal text-atlas-muted">
                  (Editando)
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="h-[50vh] pr-4">
            {isEditMode ? (
              <MarkdownEditor value={editContent} onChange={setEditContent} />
            ) : (
              <div
                className="font-serif text-[14.5px] leading-[1.65] text-atlas-ink-2 [&_h4]:font-semibold [&_h4]:text-atlas-ink [&_h4]:text-[1.05rem] [&_h4]:mt-4 [&_h4]:mb-1.5 [&_h5]:font-semibold [&_h5]:text-atlas-ink [&_h5]:text-[0.95rem] [&_h5]:mt-3 [&_h5]:mb-1 [&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-0.5 [&_strong]:font-semibold [&_strong]:text-atlas-ink"
                dangerouslySetInnerHTML={{
                  __html: formatMarkdown(selectedSummary?.content ?? ''),
                }}
              />
            )}
          </ScrollArea>

          <Separator />

          <DialogFooter className="flex-row justify-between sm:justify-between">
            <div className="flex gap-2">
              {isEditMode ? (
                <>
                  <AtlasButton
                    variant="outline"
                    size="md"
                    onClick={() => setIsEditMode(false)}
                    disabled={isSaving}
                  >
                    <X strokeWidth={1.5} />
                    Cancelar
                  </AtlasButton>
                  <AtlasButton
                    variant="primary"
                    size="md"
                    onClick={handleSaveEdit}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Save strokeWidth={1.5} />
                    )}
                    Salvar
                  </AtlasButton>
                </>
              ) : (
                <>
                  <AtlasButton
                    variant="outline"
                    size="md"
                    onClick={handleEditSummary}
                  >
                    <Pencil strokeWidth={1.5} />
                    Editar
                  </AtlasButton>
                  <AtlasButton
                    variant="outline"
                    size="md"
                    onClick={() =>
                      selectedSummary && handleDownload(selectedSummary)
                    }
                  >
                    <Download strokeWidth={1.5} />
                    Baixar PDF
                  </AtlasButton>
                </>
              )}
            </div>
            <Button variant="ghost" onClick={() => setIsViewModalOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
