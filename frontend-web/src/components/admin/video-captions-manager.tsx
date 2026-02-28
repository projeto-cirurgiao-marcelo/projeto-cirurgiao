'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Subtitles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  Download,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  captionsService,
  Caption,
  SUPPORTED_CAPTION_LANGUAGES,
  SupportedCaptionLanguage,
} from '@/lib/api/captions.service';

interface VideoCaptionsManagerProps {
  videoId: string;
  videoStatus: string; // Status do vídeo (READY, PROCESSING, etc)
  cloudflareId?: string | null; // Se tem cloudflareId, é um vídeo do Cloudflare
}

export function VideoCaptionsManager({
  videoId,
  videoStatus,
  cloudflareId,
}: VideoCaptionsManagerProps) {
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedCaptionLanguage>('pt');
  const [pollingCaption, setPollingCaption] = useState<string | null>(null);

  // Carregar legendas
  const loadCaptions = useCallback(async () => {
    // Não carregar se não tiver cloudflareId
    if (!cloudflareId) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const data = await captionsService.listCaptions(videoId);
      setCaptions(data);

      // Verificar se há legendas em processamento
      const inProgress = data.find((c) => c.status === 'inprogress');
      if (inProgress) {
        setPollingCaption(inProgress.language);
      } else {
        setPollingCaption(null);
      }
    } catch (error: any) {
      // Não logar erro 401 para evitar spam no console
      // O erro 401 será tratado pelo interceptor global
      if (error?.response?.status !== 401) {
        console.error('Erro ao carregar legendas:', error);
      }
      // Em caso de erro, apenas mostrar lista vazia
      setCaptions([]);
    } finally {
      setLoading(false);
    }
  }, [videoId, cloudflareId]);

  useEffect(() => {
    if (cloudflareId) {
      loadCaptions();
    } else {
      setLoading(false);
    }
  }, [cloudflareId, loadCaptions]);

  // Polling para verificar status de legendas em processamento
  useEffect(() => {
    if (!pollingCaption) return;

    const interval = setInterval(async () => {
      try {
        const status = await captionsService.getCaptionStatus(videoId, pollingCaption);
        if (status && status.status !== 'inprogress') {
          // Legenda pronta ou com erro
          setPollingCaption(null);
          loadCaptions();

          if (status.status === 'ready') {
            toast.success('Legenda gerada com sucesso!', {
              description: `A legenda em ${status.label} está pronta.`,
            });
          } else if (status.status === 'error') {
            toast.error('Erro ao gerar legenda', {
              description: 'Tente novamente mais tarde.',
            });
          }
        }
      } catch (error) {
        console.error('Erro ao verificar status:', error);
      }
    }, 5000); // Verificar a cada 5 segundos

    return () => clearInterval(interval);
  }, [pollingCaption, videoId, loadCaptions]);

  // Gerar legenda
  const handleGenerateCaption = async () => {
    // Verificar se já existe legenda nesse idioma
    const existingCaption = captions.find((c) => c.language === selectedLanguage);
    if (existingCaption) {
      toast.error('Legenda já existe', {
        description: `Já existe uma legenda em ${captionsService.getLanguageLabel(selectedLanguage)}. Delete-a primeiro para gerar uma nova.`,
      });
      return;
    }

    try {
      setGenerating(true);
      const result = await captionsService.generateCaption(videoId, selectedLanguage);

      toast.success('Geração iniciada!', {
        description: `A legenda em ${result.label} está sendo gerada. Isso pode levar alguns minutos.`,
      });

      // Adicionar à lista e iniciar polling
      setCaptions([...captions, result]);
      setPollingCaption(result.language);
    } catch (error: any) {
      console.error('Erro ao gerar legenda:', error);
      toast.error('Erro ao gerar legenda', {
        description: error?.response?.data?.message || 'Tente novamente mais tarde.',
      });
    } finally {
      setGenerating(false);
    }
  };

  // Deletar legenda
  const handleDeleteCaption = async (language: string) => {
    if (!confirm(`Tem certeza que deseja deletar a legenda em ${captionsService.getLanguageLabel(language)}?`)) {
      return;
    }

    try {
      await captionsService.deleteCaption(videoId, language);
      setCaptions(captions.filter((c) => c.language !== language));
      toast.success('Legenda deletada com sucesso!');
    } catch (error: any) {
      console.error('Erro ao deletar legenda:', error);
      toast.error('Erro ao deletar legenda', {
        description: error?.response?.data?.message || 'Tente novamente mais tarde.',
      });
    }
  };

  // Renderizar ícone de status
  const renderStatusIcon = (status: Caption['status']) => {
    switch (status) {
      case 'ready':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'inprogress':
        return <Clock className="h-4 w-4 text-yellow-500 animate-pulse" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  // Renderizar texto de status
  const renderStatusText = (status: Caption['status']) => {
    switch (status) {
      case 'ready':
        return <span className="text-green-600 text-xs">Pronta</span>;
      case 'inprogress':
        return <span className="text-yellow-600 text-xs">Gerando...</span>;
      case 'error':
        return <span className="text-red-600 text-xs">Erro</span>;
      default:
        return null;
    }
  };

  // Se não é um vídeo do Cloudflare
  if (!cloudflareId) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Subtitles className="h-5 w-5 text-gray-400" />
          <h3 className="font-semibold text-gray-700">Legendas / Captions</h3>
        </div>
        <p className="text-sm text-gray-500">
          Legendas automáticas só estão disponíveis para vídeos hospedados no Cloudflare Stream.
        </p>
      </div>
    );
  }

  // Se o vídeo não está pronto (mas permitir se já tiver cloudflareId válido)
  // Isso permite gerar legendas para vídeos que foram adicionados via URL do Cloudflare
  const isVideoReady = videoStatus === 'READY' || (cloudflareId && cloudflareId.length > 0);
  
  if (!isVideoReady) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Subtitles className="h-5 w-5 text-yellow-600" />
          <h3 className="font-semibold text-yellow-800">Legendas / Captions</h3>
        </div>
        <p className="text-sm text-yellow-700">
          O vídeo ainda está sendo processado. Aguarde o processamento ser concluído para gerar legendas.
        </p>
        <p className="text-xs text-yellow-600 mt-1">
          Status atual: {videoStatus}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Subtitles className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Legendas / Captions</h3>
          {captions.length > 0 && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
              {captions.filter((c) => c.status === 'ready').length} disponível(is)
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={loadCaptions}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Gerar nova legenda */}
      <div className="flex items-center gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
        <Select
          value={selectedLanguage}
          onValueChange={(value: string) => setSelectedLanguage(value as SupportedCaptionLanguage)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Selecione o idioma" />
          </SelectTrigger>
          <SelectContent>
            {SUPPORTED_CAPTION_LANGUAGES.map((lang) => (
              <SelectItem key={lang.code} value={lang.code}>
                {lang.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          onClick={handleGenerateCaption}
          disabled={generating || !!pollingCaption}
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
        >
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Gerando...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Gerar Legenda (IA)
            </>
          )}
        </Button>
      </div>

      {/* Lista de legendas */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : captions.length === 0 ? (
        <div className="text-center py-6 text-gray-500">
          <Subtitles className="h-10 w-10 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">Nenhuma legenda disponível</p>
          <p className="text-xs text-gray-400 mt-1">
            Clique em "Gerar Legenda (IA)" para criar legendas automaticamente
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {captions.map((caption) => (
            <div
              key={caption.language}
              className={`
                flex items-center justify-between p-3 rounded-lg border
                ${caption.status === 'ready' 
                  ? 'bg-green-50 border-green-200' 
                  : caption.status === 'inprogress'
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-red-50 border-red-200'
                }
              `}
            >
              <div className="flex items-center gap-3">
                {renderStatusIcon(caption.status)}
                <div>
                  <p className="font-medium text-gray-900">{caption.label}</p>
                  <div className="flex items-center gap-2">
                    {renderStatusText(caption.status)}
                    {caption.generated && (
                      <span className="text-xs text-gray-500">(auto-gerada)</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {caption.status === 'ready' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      // Abrir VTT em nova aba para download
                      window.open(
                        captionsService.getCaptionVttUrl(videoId, caption.language),
                        '_blank'
                      );
                    }}
                    title="Baixar arquivo VTT"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteCaption(caption.language)}
                  disabled={caption.status === 'inprogress'}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  title="Deletar legenda"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-xs text-blue-700">
          <strong>💡 Dica:</strong> As legendas são geradas automaticamente usando IA (speech-to-text).
          O processo pode levar alguns minutos dependendo da duração do vídeo.
          As legendas aparecerão automaticamente no player do estudante.
        </p>
      </div>
    </div>
  );
}