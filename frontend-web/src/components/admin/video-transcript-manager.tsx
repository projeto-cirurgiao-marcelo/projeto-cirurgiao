'use client';

import { useState, useRef, useEffect } from 'react';
import { FileText, Upload, Trash2, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { transcriptsService, Transcript, TranscriptSegment } from '@/lib/api/transcripts.service';

interface VideoTranscriptManagerProps {
  videoId: string;
  initialTranscript?: Transcript | null;
  onTranscriptChange?: (transcript: Transcript | null) => void;
}

type UploadMode = 'manual' | 'aws' | 'file';

export function VideoTranscriptManager({ 
  videoId, 
  initialTranscript,
  onTranscriptChange 
}: VideoTranscriptManagerProps) {
  const [transcript, setTranscript] = useState<Transcript | null>(initialTranscript || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploadMode, setUploadMode] = useState<UploadMode>('manual');
  
  // Estados para entrada manual
  const [manualSegments, setManualSegments] = useState<string>('');
  
  // Estados para upload de arquivo
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Carregar transcrição ao montar o componente
  useEffect(() => {
    const loadTranscript = async () => {
      try {
        const data = await transcriptsService.getByVideoId(videoId);
        if (data && data.segments) {
          setTranscript(data);
        }
      } catch (error) {
        // Silenciosamente ignora se não houver transcrição
        console.log('Nenhuma transcrição encontrada para este vídeo');
      }
    };

    loadTranscript();
  }, [videoId]);

  // Formata segundos para MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Parse de texto manual para segmentos
  // Formato esperado: "00:00 - Texto do segmento" ou "0 - Texto do segmento"
  const parseManualSegments = (text: string): TranscriptSegment[] => {
    const lines = text.trim().split('\n').filter(line => line.trim());
    const segments: TranscriptSegment[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Tenta fazer parse do formato "MM:SS - Texto" ou "segundos - Texto"
      const match = line.match(/^(\d+):?(\d+)?\s*[-–]\s*(.+)$/);
      
      if (match) {
        let startTime: number;
        
        if (match[2]) {
          // Formato MM:SS
          startTime = parseInt(match[1]) * 60 + parseInt(match[2]);
        } else {
          // Formato apenas segundos
          startTime = parseInt(match[1]);
        }
        
        // EndTime é o início do próximo segmento ou +30 segundos
        const nextLine = lines[i + 1];
        let endTime = startTime + 30; // Default: 30 segundos
        
        if (nextLine) {
          const nextMatch = nextLine.match(/^(\d+):?(\d+)?\s*[-–]/);
          if (nextMatch) {
            if (nextMatch[2]) {
              endTime = parseInt(nextMatch[1]) * 60 + parseInt(nextMatch[2]);
            } else {
              endTime = parseInt(nextMatch[1]);
            }
          }
        }
        
        segments.push({
          startTime,
          endTime,
          text: match[3].trim(),
        });
      }
    }
    
    return segments;
  };

  // Salvar transcrição manual
  const handleSaveManual = async () => {
    if (!manualSegments.trim()) {
      setError('Por favor, insira os segmentos da transcrição');
      return;
    }

    const segments = parseManualSegments(manualSegments);
    
    if (segments.length === 0) {
      setError('Não foi possível interpretar os segmentos. Use o formato: "00:00 - Texto do segmento"');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const fullText = segments.map(s => s.text).join(' ');
      const result = await transcriptsService.createOrUpdate(videoId, {
        language: 'pt-BR',
        fullText,
        segments,
      });
      
      setTranscript(result);
      onTranscriptChange?.(result);
      setSuccess(`Transcrição salva com ${segments.length} segmentos!`);
      setManualSegments('');
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar transcrição');
    } finally {
      setLoading(false);
    }
  };

  // Upload de arquivo JSON do AWS Transcribe
  const handleFileUpload = async () => {
    if (!selectedFile) {
      setError('Por favor, selecione um arquivo JSON');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const fileContent = await selectedFile.text();
      const awsJson = JSON.parse(fileContent);
      
      const result = await transcriptsService.uploadAWSTranscript(videoId, awsJson);
      
      setTranscript(result);
      onTranscriptChange?.(result);
      setSuccess('Transcrição do AWS Transcribe importada com sucesso!');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      console.error('Erro ao importar transcrição:', err);
      console.error('Detalhes do erro:', {
        response: err.response,
        data: err.response?.data,
        message: err.message,
        status: err.response?.status
      });
      
      if (err instanceof SyntaxError) {
        setError('Arquivo JSON inválido. Verifique o formato do arquivo.');
      } else if (err.response?.data) {
        // Tenta extrair a mensagem de erro do backend
        const errorData = err.response.data;
        let errorMessage = 'Erro do servidor';
        
        if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (Array.isArray(errorData.message)) {
          errorMessage = errorData.message.join(', ');
        } else if (errorData.error) {
          errorMessage = errorData.error;
        }
        
        setError(`${errorMessage} (Status: ${err.response.status})`);
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('Erro desconhecido ao importar transcrição. Verifique o console para mais detalhes.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Remover transcrição
  const handleRemove = async () => {
    if (!confirm('Tem certeza que deseja remover a transcrição deste vídeo?')) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await transcriptsService.remove(videoId);
      setTranscript(null);
      onTranscriptChange?.(null);
      setSuccess('Transcrição removida com sucesso!');
    } catch (err: any) {
      setError(err.message || 'Erro ao remover transcrição');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border-2 border-gray-200 rounded-lg p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Transcrição do Vídeo</h3>
        </div>
        
        {transcript && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRemove}
            disabled={loading}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Remover
          </Button>
        )}
      </div>

      {/* Mensagens de erro/sucesso */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm">{success}</span>
        </div>
      )}

      {/* Transcrição existente */}
      {transcript && transcript.segments && transcript.segments.length > 0 ? (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Transcrição atual ({transcript.segments.length} segmentos)
            </span>
            <span className="text-xs text-gray-500">
              Idioma: {transcript.language}
            </span>
          </div>
          
          <div className="max-h-[200px] overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50">
            {transcript.segments.slice(0, 10).map((segment, index) => (
              <div key={index} className="flex gap-2 mb-2 last:mb-0">
                <span className="text-xs font-mono bg-gray-200 px-2 py-0.5 rounded text-gray-600 flex-shrink-0">
                  {formatTime(segment.startTime)}
                </span>
                <span className="text-sm text-gray-700">{segment.text}</span>
              </div>
            ))}
            {transcript.segments.length > 10 && (
              <p className="text-xs text-gray-500 mt-2 text-center">
                ... e mais {transcript.segments.length - 10} segmentos
              </p>
            )}
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-500 mb-4">
          Nenhuma transcrição cadastrada para este vídeo.
        </p>
      )}

      {/* Tabs de modo de upload */}
      <div className="border-b border-gray-200 mb-4">
        <div className="flex gap-4">
          <button
            onClick={() => setUploadMode('manual')}
            className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
              uploadMode === 'manual'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Entrada Manual
          </button>
          <button
            onClick={() => setUploadMode('aws')}
            className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
              uploadMode === 'aws'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            AWS Transcribe
          </button>
        </div>
      </div>

      {/* Conteúdo baseado no modo */}
      {uploadMode === 'manual' && (
        <div className="space-y-4">
          <div>
            <Label htmlFor="manual-segments" className="text-sm font-medium text-gray-700">
              Segmentos da Transcrição
            </Label>
            <p className="text-xs text-gray-500 mb-2">
              Formato: "MM:SS - Texto do segmento" (um por linha)
            </p>
            <Textarea
              id="manual-segments"
              value={manualSegments}
              onChange={(e) => setManualSegments(e.target.value)}
              placeholder={`00:00 - Olá, bem-vindos à aula de hoje.
00:15 - Vamos começar falando sobre...
01:30 - O próximo tópico é...`}
              rows={8}
              className="font-mono text-sm"
            />
          </div>
          
          <Button
            onClick={handleSaveManual}
            disabled={loading || !manualSegments.trim()}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Salvar Transcrição
              </>
            )}
          </Button>
        </div>
      )}

      {uploadMode === 'aws' && (
        <div className="space-y-4">
          <div>
            <Label htmlFor="aws-file" className="text-sm font-medium text-gray-700">
              Arquivo JSON do AWS Transcribe
            </Label>
            <p className="text-xs text-gray-500 mb-2">
              Faça upload do arquivo JSON gerado pelo AWS Transcribe
            </p>
            <input
              ref={fileInputRef}
              type="file"
              id="aws-file"
              accept=".json"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100
                cursor-pointer"
            />
            {selectedFile && (
              <p className="text-xs text-gray-600 mt-1">
                Arquivo selecionado: {selectedFile.name}
              </p>
            )}
          </div>
          
          <Button
            onClick={handleFileUpload}
            disabled={loading || !selectedFile}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Importar do AWS Transcribe
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
