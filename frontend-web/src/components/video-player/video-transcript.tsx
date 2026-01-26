'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { FileText, ChevronDown, ChevronUp, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { transcriptsService, Transcript, TranscriptSegment } from '@/lib/api/transcripts.service';

interface VideoTranscriptProps {
  videoId: string;
  currentTime: number;
  onSeek?: (time: number) => void;
}

// Formata segundos para MM:SS
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function VideoTranscript({ videoId, currentTime, onSeek }: VideoTranscriptProps) {
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeSegmentRef = useRef<HTMLButtonElement>(null);

  // Carrega a transcrição
  useEffect(() => {
    const loadTranscript = async () => {
      setLoading(true);
      try {
        const data = await transcriptsService.getByVideoId(videoId);
        setTranscript(data);
      } catch (error) {
        console.error('Erro ao carregar transcrição:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTranscript();
  }, [videoId]);

  // Encontra o segmento atual baseado no tempo do vídeo
  const activeSegmentIndex = useMemo(() => {
    if (!transcript?.segments) return -1;
    
    for (let i = transcript.segments.length - 1; i >= 0; i--) {
      if (currentTime >= transcript.segments[i].startTime) {
        return i;
      }
    }
    return -1;
  }, [transcript?.segments, currentTime]);

  // Auto-scroll para o segmento ativo
  useEffect(() => {
    if (autoScroll && activeSegmentRef.current && containerRef.current) {
      const container = containerRef.current;
      const element = activeSegmentRef.current;
      
      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      
      // Verifica se o elemento está fora da área visível
      if (elementRect.top < containerRect.top || elementRect.bottom > containerRect.bottom) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeSegmentIndex, autoScroll]);

  // Handler para click no segmento
  const handleSegmentClick = (segment: TranscriptSegment) => {
    if (onSeek) {
      onSeek(segment.startTime);
      setAutoScroll(true);
    }
  };

  // Se está carregando
  if (loading) {
    return (
      <div className="bg-white border-2 border-gray-200 rounded-lg p-4 shadow-sm">
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Carregando transcrição...</span>
        </div>
      </div>
    );
  }

  // Se não tem transcrição
  if (!transcript || !transcript.segments || transcript.segments.length === 0) {
    return null; // Não mostra nada se não tem transcrição
  }

  return (
    <div className="bg-white border-2 border-gray-200 rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-600" />
          <span className="font-semibold text-gray-900">Transcrição</span>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
            {transcript.segments.length} segmentos
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </button>

      {/* Content */}
      <div 
        className={`
          border-t border-gray-200 overflow-hidden transition-all duration-300 ease-in-out
          ${expanded ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'}
        `}
      >
        <div className={expanded ? '' : 'pointer-events-none'}>
          {/* Auto-scroll toggle */}
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Clique em um trecho para pular para esse momento
            </span>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs text-gray-600">Auto-scroll</span>
            </label>
          </div>

          {/* Segments list */}
          <div
            ref={containerRef}
            className="max-h-[300px] overflow-y-auto p-2 space-y-1"
            onMouseEnter={() => setAutoScroll(false)}
            onMouseLeave={() => setAutoScroll(true)}
          >
            {transcript.segments.map((segment, index) => {
              const isActive = index === activeSegmentIndex;
              
              return (
                <button
                  key={index}
                  ref={isActive ? activeSegmentRef : null}
                  onClick={() => handleSegmentClick(segment)}
                  className={`
                    w-full text-left p-3 rounded-lg transition-all duration-200
                    ${isActive
                      ? 'bg-blue-50 border-2 border-blue-300 shadow-sm'
                      : 'hover:bg-gray-50 border-2 border-transparent'
                    }
                  `}
                >
                  <div className="flex items-start gap-3">
                    {/* Timestamp */}
                    <div className={`
                      flex items-center gap-1 text-xs font-mono px-2 py-1 rounded
                      ${isActive
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600'
                      }
                    `}>
                      <Clock className="h-3 w-3" />
                      {formatTime(segment.startTime)}
                    </div>
                    
                    {/* Text */}
                    <p className={`
                      text-sm flex-1 leading-relaxed
                      ${isActive ? 'text-gray-900 font-medium' : 'text-gray-700'}
                    `}>
                      {segment.text}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// Versão compacta para mobile
export function VideoTranscriptCompact({ videoId, currentTime, onSeek }: VideoTranscriptProps) {
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Carrega a transcrição
  useEffect(() => {
    const loadTranscript = async () => {
      setLoading(true);
      try {
        const data = await transcriptsService.getByVideoId(videoId);
        setTranscript(data);
      } catch (error) {
        console.error('Erro ao carregar transcrição:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTranscript();
  }, [videoId]);

  // Encontra o segmento atual
  const activeSegment = useMemo(() => {
    if (!transcript?.segments) return null;
    
    for (let i = transcript.segments.length - 1; i >= 0; i--) {
      if (currentTime >= transcript.segments[i].startTime) {
        return transcript.segments[i];
      }
    }
    return null;
  }, [transcript?.segments, currentTime]);

  if (loading || !transcript || !transcript.segments || transcript.segments.length === 0) {
    return null;
  }

  return (
    <>
      {/* Botão compacto */}
      <button
        onClick={() => setShowModal(true)}
        className="w-full bg-white border-2 border-gray-200 rounded-lg p-3 shadow-sm hover:border-blue-300 transition-colors"
      >
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-blue-600 flex-shrink-0" />
          <div className="flex-1 min-w-0 text-left">
            <p className="text-xs font-medium text-gray-900 mb-0.5">Transcrição</p>
            {activeSegment && (
              <p className="text-xs text-gray-600 truncate">
                {activeSegment.text.substring(0, 60)}...
              </p>
            )}
          </div>
          <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
        </div>
      </button>

      {/* Modal fullscreen para mobile */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-white">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <span className="font-semibold text-gray-900">Transcrição</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowModal(false)}
              >
                Fechar
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {transcript.segments.map((segment, index) => {
                const isActive = activeSegment?.startTime === segment.startTime;
                
                return (
                  <button
                    key={index}
                    onClick={() => {
                      if (onSeek) {
                        onSeek(segment.startTime);
                        setShowModal(false);
                      }
                    }}
                    className={`
                      w-full text-left p-3 rounded-lg transition-all
                      ${isActive
                        ? 'bg-blue-50 border-2 border-blue-300'
                        : 'bg-gray-50 border-2 border-transparent'
                      }
                    `}
                  >
                    <div className="flex items-start gap-2">
                      <span className={`
                        text-xs font-mono px-2 py-0.5 rounded
                        ${isActive ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}
                      `}>
                        {formatTime(segment.startTime)}
                      </span>
                      <p className={`
                        text-sm flex-1
                        ${isActive ? 'text-gray-900 font-medium' : 'text-gray-700'}
                      `}>
                        {segment.text}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
