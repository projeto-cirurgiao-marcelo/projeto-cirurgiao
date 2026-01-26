'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, FileText, Link as LinkIcon, FileEdit, Loader2, ExternalLink, Pencil, Upload, X, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { materialsService, VideoMaterial, MaterialType, CreateMaterialDto } from '@/lib/api/materials.service';
import { storageService, UploadProgress } from '@/lib/firebase/storage.service';

interface VideoMaterialsManagerProps {
  videoId: string;
}

type InputMode = 'url' | 'upload';

export function VideoMaterialsManager({ videoId }: VideoMaterialsManagerProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [materials, setMaterials] = useState<VideoMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<VideoMaterial | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Form state
  const [inputMode, setInputMode] = useState<InputMode>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [formData, setFormData] = useState<CreateMaterialDto>({
    title: '',
    description: '',
    type: 'PDF',
    url: '',
    fileSize: undefined,
  });

  useEffect(() => {
    loadMaterials();
  }, [videoId]);

  const loadMaterials = async () => {
    try {
      setLoading(true);
      const data = await materialsService.getByVideo(videoId);
      setMaterials(data);
    } catch (err) {
      console.error('Erro ao carregar materiais:', err);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os materiais.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      type: 'PDF',
      url: '',
      fileSize: undefined,
    });
    setSelectedFile(null);
    setUploadProgress(null);
    setInputMode('upload');
  };

  const openAddModal = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const openEditModal = (material: VideoMaterial) => {
    setEditingMaterial(material);
    setFormData({
      title: material.title,
      description: material.description || '',
      type: material.type,
      url: material.url,
      fileSize: material.fileSize,
    });
    setInputMode('url'); // No edit, sempre mostra URL
    setIsEditModalOpen(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar tipo
      if (!storageService.isAllowedFileType(file)) {
        toast({
          title: 'Tipo não permitido',
          description: 'Selecione um arquivo PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT ou imagem.',
          variant: 'destructive',
        });
        return;
      }

      // Validar tamanho (50MB)
      if (file.size > 50 * 1024 * 1024) {
        toast({
          title: 'Arquivo muito grande',
          description: 'O limite é de 50MB por arquivo.',
          variant: 'destructive',
        });
        return;
      }

      setSelectedFile(file);
      
      // Auto-preencher título se vazio
      if (!formData.title) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        setFormData(prev => ({ ...prev, title: nameWithoutExt }));
      }

      // Auto-detectar tipo
      const ext = storageService.getFileExtension(file.name);
      let type: MaterialType = 'PDF';
      if (ext === 'pdf') type = 'PDF';
      else if (['doc', 'docx', 'txt'].includes(ext)) type = 'ARTICLE';
      else type = 'LINK';
      
      setFormData(prev => ({ ...prev, type, fileSize: file.size }));
    }
  };

  const handleAdd = async () => {
    // Validação
    if (!formData.title.trim()) {
      toast({
        title: 'Erro',
        description: 'Preencha o título do material.',
        variant: 'destructive',
      });
      return;
    }

    if (inputMode === 'url' && !formData.url.trim()) {
      toast({
        title: 'Erro',
        description: 'Preencha a URL do material.',
        variant: 'destructive',
      });
      return;
    }

    if (inputMode === 'upload' && !selectedFile) {
      toast({
        title: 'Erro',
        description: 'Selecione um arquivo para upload.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);
      let finalUrl = formData.url;
      let finalFileSize = formData.fileSize;

      // Se for upload, fazer upload primeiro
      if (inputMode === 'upload' && selectedFile) {
        setUploadProgress({ progress: 0, bytesTransferred: 0, totalBytes: selectedFile.size, state: 'running' });
        
        const result = await storageService.uploadMaterial(
          selectedFile,
          videoId,
          (progress) => setUploadProgress(progress)
        );

        finalUrl = result.url;
        finalFileSize = result.fileSize;
      }

      // Criar material no backend
      await materialsService.create(videoId, {
        ...formData,
        url: finalUrl,
        fileSize: finalFileSize,
      });

      toast({
        title: 'Sucesso',
        description: 'Material adicionado com sucesso!',
      });
      setIsAddModalOpen(false);
      resetForm();
      await loadMaterials();
    } catch (err: any) {
      console.error('Erro ao adicionar material:', err);
      toast({
        title: 'Erro',
        description: err.message || 'Não foi possível adicionar o material.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
      setUploadProgress(null);
    }
  };

  const handleUpdate = async () => {
    if (!editingMaterial || !formData.title.trim() || !formData.url.trim()) {
      toast({
        title: 'Erro',
        description: 'Preencha o título e a URL do material.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);
      await materialsService.update(videoId, editingMaterial.id, formData);
      toast({
        title: 'Sucesso',
        description: 'Material atualizado com sucesso!',
      });
      setIsEditModalOpen(false);
      setEditingMaterial(null);
      resetForm();
      await loadMaterials();
    } catch (err: any) {
      console.error('Erro ao atualizar material:', err);
      toast({
        title: 'Erro',
        description: err.message || 'Não foi possível atualizar o material.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (materialId: string) => {
    if (!confirm('Tem certeza que deseja remover este material?')) {
      return;
    }

    try {
      setDeleting(materialId);
      await materialsService.delete(videoId, materialId);
      toast({
        title: 'Sucesso',
        description: 'Material removido com sucesso!',
      });
      await loadMaterials();
    } catch (err: any) {
      console.error('Erro ao remover material:', err);
      toast({
        title: 'Erro',
        description: err.message || 'Não foi possível remover o material.',
        variant: 'destructive',
      });
    } finally {
      setDeleting(null);
    }
  };

  const getIcon = (type: MaterialType) => {
    switch (type) {
      case 'PDF':
        return <FileText className="h-4 w-4 text-red-500" />;
      case 'LINK':
        return <LinkIcon className="h-4 w-4 text-blue-500" />;
      case 'ARTICLE':
        return <FileEdit className="h-4 w-4 text-green-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const getBadgeVariant = (type: MaterialType) => {
    switch (type) {
      case 'PDF':
        return 'destructive';
      case 'LINK':
        return 'default';
      case 'ARTICLE':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  // Form component para Adicionar
  const AddMaterialForm = () => (
    <div className="space-y-4">
      {/* Toggle entre Upload e URL */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg">
        <Button
          variant={inputMode === 'upload' ? 'default' : 'ghost'}
          className="flex-1 text-xs"
          onClick={() => {
            setInputMode('upload');
            setFormData(prev => ({ ...prev, url: '' }));
          }}
          disabled={saving}
          type="button"
        >
          <Upload className="mr-1 h-3 w-3" />
          Upload de Arquivo
        </Button>
        <Button
          variant={inputMode === 'url' ? 'default' : 'ghost'}
          className="flex-1 text-xs"
          onClick={() => {
            setInputMode('url');
            setSelectedFile(null);
          }}
          disabled={saving}
          type="button"
        >
          <LinkIcon className="mr-1 h-3 w-3" />
          URL Externa
        </Button>
      </div>

      {/* Modo Upload */}
      {inputMode === 'upload' && (
        <div className="space-y-2">
          <Label>Arquivo *</Label>
          <div
            className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
              selectedFile ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : 'border-gray-300 hover:border-primary'
            }`}
            onClick={() => !saving && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif"
              onChange={handleFileSelect}
              className="hidden"
              disabled={saving}
            />
            {selectedFile ? (
              <div className="flex items-center justify-center gap-2">
                <File className="h-6 w-6 text-green-600" />
                <div className="text-left">
                  <p className="font-medium text-sm truncate max-w-[200px]">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">{storageService.formatFileSize(selectedFile.size)}</p>
                </div>
                {!saving && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                    }}
                    type="button"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ) : (
              <div>
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Clique para selecionar um arquivo
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, imagens (até 50MB)
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modo URL */}
      {inputMode === 'url' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="type">Tipo de Material *</Label>
            <Select
              value={formData.type}
              onValueChange={(value: MaterialType) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PDF">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-red-500" />
                    PDF / Documento
                  </div>
                </SelectItem>
                <SelectItem value="LINK">
                  <div className="flex items-center gap-2">
                    <LinkIcon className="h-4 w-4 text-blue-500" />
                    Link Externo
                  </div>
                </SelectItem>
                <SelectItem value="ARTICLE">
                  <div className="flex items-center gap-2">
                    <FileEdit className="h-4 w-4 text-green-500" />
                    Artigo / Texto
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">URL do Material *</Label>
            <Input
              id="url"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder="https://exemplo.com/documento.pdf"
              disabled={saving}
            />
          </div>
        </>
      )}

      <div className="space-y-2">
        <Label htmlFor="title">Título *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Ex: Slides da Aula"
          disabled={saving}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição (Opcional)</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Breve descrição do material..."
          className="min-h-[60px]"
          disabled={saving}
        />
      </div>

      {/* Progress bar durante upload */}
      {uploadProgress && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Enviando arquivo...</span>
            <span>{uploadProgress.progress.toFixed(0)}%</span>
          </div>
          <Progress value={uploadProgress.progress} />
        </div>
      )}

      <DialogFooter>
        <Button
          variant="outline"
          onClick={() => {
            setIsAddModalOpen(false);
            resetForm();
          }}
          disabled={saving}
          type="button"
        >
          Cancelar
        </Button>
        <Button onClick={handleAdd} disabled={saving} type="button">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {uploadProgress ? 'Enviando...' : 'Salvando...'}
            </>
          ) : (
            'Adicionar Material'
          )}
        </Button>
      </DialogFooter>
    </div>
  );

  // Form component para Editar (apenas URL)
  const EditMaterialForm = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="type">Tipo de Material *</Label>
        <Select
          value={formData.type}
          onValueChange={(value: MaterialType) => setFormData({ ...formData, type: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PDF">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-red-500" />
                PDF / Documento
              </div>
            </SelectItem>
            <SelectItem value="LINK">
              <div className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-blue-500" />
                Link Externo
              </div>
            </SelectItem>
            <SelectItem value="ARTICLE">
              <div className="flex items-center gap-2">
                <FileEdit className="h-4 w-4 text-green-500" />
                Artigo / Texto
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Título *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Ex: Slides da Aula"
          disabled={saving}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="url">URL do Material *</Label>
        <Input
          id="url"
          value={formData.url}
          onChange={(e) => setFormData({ ...formData, url: e.target.value })}
          placeholder="https://exemplo.com/documento.pdf"
          disabled={saving}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição (Opcional)</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Breve descrição do material..."
          className="min-h-[60px]"
          disabled={saving}
        />
      </div>

      <DialogFooter>
        <Button
          variant="outline"
          onClick={() => {
            setIsEditModalOpen(false);
            setEditingMaterial(null);
            resetForm();
          }}
          disabled={saving}
          type="button"
        >
          Cancelar
        </Button>
        <Button onClick={handleUpdate} disabled={saving} type="button">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            'Salvar Alterações'
          )}
        </Button>
      </DialogFooter>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Materiais da Aula</CardTitle>
            <CardDescription>
              Adicione PDFs, links e artigos relacionados a esta aula
            </CardDescription>
          </div>
          <Button onClick={openAddModal} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Material
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : materials.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">Nenhum material adicionado ainda</p>
            <Button variant="outline" size="sm" onClick={openAddModal} className="mt-3">
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Primeiro Material
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {materials.map((material) => (
              <div
                key={material.id}
                className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
              >
                {/* Ícone */}
                <div className="flex-shrink-0">
                  {getIcon(material.type)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 truncate text-sm">
                      {material.title}
                    </span>
                    <Badge variant={getBadgeVariant(material.type) as any} className="text-xs">
                      {materialsService.getTypeLabel(material.type)}
                    </Badge>
                    {material.fileSize && (
                      <span className="text-xs text-gray-400">
                        ({storageService.formatFileSize(material.fileSize)})
                      </span>
                    )}
                  </div>
                  {material.description && (
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {material.description}
                    </p>
                  )}
                </div>

                {/* Ações */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => window.open(material.url, '_blank')}
                    title="Abrir material"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditModal(material)}
                    title="Editar material"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(material.id)}
                    disabled={deleting === material.id}
                    title="Remover material"
                  >
                    {deleting === material.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 text-destructive" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Modal Adicionar */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Adicionar Material</DialogTitle>
            <DialogDescription>
              Faça upload de um arquivo ou adicione uma URL externa
            </DialogDescription>
          </DialogHeader>
          <AddMaterialForm />
        </DialogContent>
      </Dialog>

      {/* Modal Editar */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Material</DialogTitle>
            <DialogDescription>
              Atualize as informações do material
            </DialogDescription>
          </DialogHeader>
          <EditMaterialForm />
        </DialogContent>
      </Dialog>
    </Card>
  );
}
