'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Sparkles,
  FileText,
  Download,
  Pencil,
  Trash2,
  Loader2,
  Lightbulb,
  Eye,
  Save,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  summariesService,
  VideoSummary,
  SummariesListResponse,
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

  // Carregar resumos ao montar
  useEffect(() => {
    loadSummaries();
  }, [videoId]);

  const loadSummaries = async () => {
    try {
      setIsLoading(true);
      const response = await summariesService.listSummaries(videoId);
      setSummaries(response.summaries);
      setRemainingGenerations(response.remainingGenerations);
      setMaxAllowed(response.maxAllowed);
    } catch (error) {
      console.error('Erro ao carregar resumos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!hasTranscript) {
      toast.error('Este vídeo ainda não possui transcrição. Aguarde a geração da legenda.');
      return;
    }

    if (remainingGenerations <= 0) {
      toast.error('Você já atingiu o limite de resumos para este vídeo.');
      return;
    }

    try {
      setIsGenerating(true);
      toast.info('Gerando resumo com IA... Isso pode levar alguns segundos.');
      
      const newSummary = await summariesService.generateSummary(videoId);
      
      setSummaries((prev) => [...prev, newSummary]);
      setRemainingGenerations(newSummary.remainingGenerations);
      
      toast.success('Resumo gerado com sucesso!');
      
      // Abrir o resumo gerado
      setSelectedSummary(newSummary);
      setIsViewModalOpen(true);
    } catch (error: any) {
      console.error('Erro ao gerar resumo:', error);
      toast.error(error.response?.data?.message || 'Erro ao gerar resumo');
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
        editContent
      );
      
      setSummaries((prev) =>
        prev.map((s) => (s.id === updated.id ? updated : s))
      );
      setSelectedSummary(updated);
      setIsEditMode(false);
      toast.success('Resumo atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar resumo:', error);
      toast.error('Erro ao salvar alterações');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = async (summary: VideoSummary) => {
    try {
      await summariesService.downloadSummary(videoId, summary.id);
      toast.success('Download iniciado!');
    } catch (error) {
      console.error('Erro ao baixar resumo:', error);
      toast.error('Erro ao baixar resumo');
    }
  };

  const handleDelete = async (summary: VideoSummary) => {
    if (!confirm('Tem certeza que deseja excluir este resumo?')) return;

    try {
      await summariesService.deleteSummary(videoId, summary.id);
      setSummaries((prev) => prev.filter((s) => s.id !== summary.id));
      setRemainingGenerations((prev) => prev + 1);
      toast.success('Resumo excluído com sucesso!');
      
      if (selectedSummary?.id === summary.id) {
        setIsViewModalOpen(false);
        setSelectedSummary(null);
      }
    } catch (error) {
      console.error('Erro ao excluir resumo:', error);
      toast.error('Erro ao excluir resumo');
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
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-purple-500" />
            Resumos com IA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Info sobre limite */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Seus resumos personalizados</span>
            <span className="font-medium">
              {summaries.length}/{maxAllowed} usados
            </span>
          </div>

          {/* Lista de resumos existentes */}
          {summaries.length > 0 && (
            <div className="space-y-2">
              {summaries.map((summary) => (
                <div
                  key={summary.id}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        Resumo #{summary.version}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(summary.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleViewSummary(summary)}
                      title="Visualizar"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDownload(summary)}
                      title="Baixar .md"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(summary)}
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Botão de gerar */}
          <Button
            onClick={handleGenerateSummary}
            disabled={isGenerating || remainingGenerations <= 0 || !hasTranscript}
            className="w-full"
            variant={remainingGenerations > 0 ? 'default' : 'secondary'}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando resumo...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Gerar Novo Resumo com IA
                {remainingGenerations > 0 && (
                  <span className="ml-2 text-xs opacity-70">
                    ({remainingGenerations} restantes)
                  </span>
                )}
              </>
            )}
          </Button>

          {/* Dica */}
          {!hasTranscript ? (
            <div className="flex items-start gap-2 rounded-lg bg-yellow-500/10 p-3 text-sm text-yellow-600 dark:text-yellow-400">
              <Lightbulb className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>
                Este vídeo ainda não possui transcrição. Aguarde a geração da legenda
                para poder criar resumos personalizados.
              </p>
            </div>
          ) : summaries.length === 0 ? (
            <div className="flex items-start gap-2 rounded-lg bg-blue-500/10 p-3 text-sm text-blue-600 dark:text-blue-400">
              <Lightbulb className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>
                Dica: Adicione anotações durante a aula para resumos mais
                personalizados! Suas anotações serão integradas ao resumo.
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Modal de visualização/edição */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Resumo #{selectedSummary?.version}
              {isEditMode && (
                <span className="text-sm font-normal text-muted-foreground">
                  (Editando)
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="h-[50vh] pr-4">
            {isEditMode ? (
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full h-full min-h-[400px] p-4 font-mono text-sm border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Conteúdo do resumo em Markdown..."
              />
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {/* Renderização simples do Markdown */}
                <div className="whitespace-pre-wrap font-sans">
                  {selectedSummary?.content}
                </div>
              </div>
            )}
          </ScrollArea>

          <Separator />

          <DialogFooter className="flex-row justify-between sm:justify-between">
            <div className="flex gap-2">
              {isEditMode ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setIsEditMode(false)}
                    disabled={isSaving}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Cancelar
                  </Button>
                  <Button onClick={handleSaveEdit} disabled={isSaving}>
                    {isSaving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Salvar
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={handleEditSummary}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => selectedSummary && handleDownload(selectedSummary)}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Baixar .md
                  </Button>
                </>
              )}
            </div>
            <Button variant="ghost" onClick={() => setIsViewModalOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}