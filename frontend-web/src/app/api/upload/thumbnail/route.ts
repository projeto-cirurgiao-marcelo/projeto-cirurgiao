import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'Nenhum arquivo enviado' },
        { status: 400 }
      );
    }

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Apenas imagens são permitidas' },
        { status: 400 }
      );
    }

    // Validar tamanho (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Arquivo muito grande. Máximo 5MB' },
        { status: 400 }
      );
    }

    // Extrair token de auth do header do request original
    const authHeader = request.headers.get('authorization');

    // Preparar para enviar ao backend
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);

    // Fazer upload para o backend NestJS (rota: /api/v1/upload/thumbnail)
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
    const response = await fetch(`${backendUrl}/upload/thumbnail`, {
      method: 'POST',
      body: uploadFormData,
      headers: {
        ...(authHeader ? { 'Authorization': authHeader } : {}),
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Falha no upload');
    }

    const data = await response.json();

    return NextResponse.json({ url: data.url });
  } catch (error) {
    console.error('Erro no upload:', error);
    return NextResponse.json(
      { error: 'Erro ao fazer upload da imagem' },
      { status: 500 }
    );
  }
}
