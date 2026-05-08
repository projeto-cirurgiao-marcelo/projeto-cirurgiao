"""
Video Processor - Cloud Run GPU Service

Recebe webhook do Cloudflare Worker, baixa o MP4 do R2,
processa (encode HLS + legendas), e sobe o resultado para R2.
"""

import os
import re
import json
import subprocess
import shutil
import tempfile
import logging
from flask import Flask, request, jsonify
import boto3
import requests

# ============================================================================
# Configuração
# ============================================================================

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# R2 credentials (configurar via variáveis de ambiente no Cloud Run)
R2_ENDPOINT = os.environ.get('R2_ENDPOINT', 'https://ad41f4e2927a6daf25f7c7d6891e31bd.r2.cloudflarestorage.com')
R2_ACCESS_KEY = os.environ.get('R2_ACCESS_KEY', '')
R2_SECRET_KEY = os.environ.get('R2_SECRET_KEY', '')
R2_BUCKET = os.environ.get('R2_BUCKET', 's3-projeto-cirurgiao')
WEBHOOK_SECRET = os.environ.get('WEBHOOK_SECRET', '')

# Whisper config
WHISPER_MODEL = os.environ.get('WHISPER_MODEL', 'large-v3')
WHISPER_LANGUAGE = 'pt'

# Backend webhook config (substitui SMTP)
BACKEND_API_URL = os.environ.get('BACKEND_API_URL', '')
VIDEO_WEBHOOK_SECRET = os.environ.get('VIDEO_WEBHOOK_SECRET', '')
R2_PUBLIC_URL = os.environ.get('R2_PUBLIC_URL', 'https://pub-42ef583694d949bca7c5c104422f55c7.r2.dev')

# HLS encoding profiles
HLS_PROFILES = {
    '720p':  {'height': 720,  'bitrate': '1200k', 'maxrate': '1328k'},
    '1080p': {'height': 1080, 'bitrate': '2500k', 'maxrate': '2628k'},
    '2160p': {'height': 2160, 'bitrate': '8000k', 'maxrate': '8128k'},
}


def notify_backend(payload):
    """Notifica o backend NestJS sobre o estado do job.

    Substitui o envio de e-mail. Backend persiste em VideoProcessingJob
    e o admin polla via /admin/jobs.

    Falha silenciosa: encode/upload já concluído, perder a notificação
    não justifica retry agressivo. Operador pode olhar logs do Cloud Run.
    """
    if not BACKEND_API_URL or not VIDEO_WEBHOOK_SECRET:
        logger.warning("BACKEND_API_URL/VIDEO_WEBHOOK_SECRET nao configurado, pulando notify")
        return

    url = BACKEND_API_URL.rstrip('/') + '/jobs/video-processed'
    try:
        resp = requests.post(
            url,
            headers={
                'Content-Type': 'application/json',
                'X-Webhook-Secret': VIDEO_WEBHOOK_SECRET,
            },
            json=payload,
            timeout=10,
        )
        if resp.status_code >= 300:
            logger.error(f"notify_backend HTTP {resp.status_code}: {resp.text[:300]}")
        else:
            logger.info(f"notify_backend OK: {payload.get('sourceKey')}")
    except Exception as e:
        logger.error(f"notify_backend exception: {e}")


def get_s3():
    return boto3.client('s3',
        endpoint_url=R2_ENDPOINT,
        aws_access_key_id=R2_ACCESS_KEY,
        aws_secret_access_key=R2_SECRET_KEY,
    )


# ============================================================================
# Processamento de vídeo
# ============================================================================

def get_video_info(filepath):
    """Obtém resolução e FPS do vídeo."""
    cmd = [
        'ffprobe', '-v', 'quiet', '-print_format', 'json',
        '-show_streams', '-select_streams', 'v:0', filepath
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    info = json.loads(result.stdout)
    stream = info['streams'][0]

    width = int(stream.get('width', 1920))
    height = int(stream.get('height', 1080))

    fps_str = stream.get('r_frame_rate', '30/1')
    if '/' in fps_str:
        num, den = fps_str.split('/')
        fps = round(int(num) / int(den))
    else:
        fps = int(float(fps_str))

    return width, height, fps


def encode_hls(input_file, output_dir):
    """Encoda vídeo para HLS com múltiplas qualidades."""
    os.makedirs(output_dir, exist_ok=True)
    width, height, fps = get_video_info(input_file)

    logger.info(f"Video: {width}x{height} @ {fps}fps")

    # Determinar quais perfis gerar baseado na resolução
    profiles_to_encode = {}
    for name, profile in HLS_PROFILES.items():
        if height >= profile['height']:
            profiles_to_encode[name] = profile

    if not profiles_to_encode:
        profiles_to_encode['720p'] = HLS_PROFILES['720p']

    gop = fps * 4  # keyframe a cada 4 segundos
    master_playlist_lines = ['#EXTM3U', '#EXT-X-VERSION:3', '']

    for name, profile in profiles_to_encode.items():
        logger.info(f"Encoding {name}...")
        out_height = profile['height']
        out_width = -2  # manter aspect ratio

        variant_dir = output_dir
        cmd = [
            'ffmpeg',
            '-hwaccel', 'cuda',
            '-hwaccel_output_format', 'cuda',
            '-i', input_file,
            '-vf', f'scale_cuda=-2:{out_height}',
            '-c:v', 'h264_nvenc',
            '-preset', 'p4',
            '-tune', 'hq',
            '-b:v', profile['bitrate'],
            '-maxrate', profile['maxrate'],
            '-bufsize', str(int(profile['maxrate'].replace('k', '')) * 2) + 'k',
            '-c:a', 'aac', '-b:a', '128k',
            '-g', str(gop),
            '-keyint_min', str(gop),
            '-force_key_frames', f'expr:gte(t,n_forced*4)',
            '-hls_time', '4',
            '-hls_list_size', '0',
            '-hls_segment_filename', f'{variant_dir}/{name}_%03d.ts',
            '-f', 'hls',
            f'{variant_dir}/{name}.m3u8',
            '-y'
        ]

        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            logger.error(f"ffmpeg cmd: {' '.join(cmd)}")
            logger.error(f"ffmpeg stderr (full) for {name}:\n{result.stderr}")
            raise Exception(f"Encode {name} failed")

        # Adicionar ao master playlist
        bandwidth = int(profile['maxrate'].replace('k', '')) * 1000
        res_width = round(out_height * width / height / 2) * 2
        master_playlist_lines.append(
            f'#EXT-X-STREAM-INF:BANDWIDTH={bandwidth},RESOLUTION={res_width}x{out_height}'
        )
        master_playlist_lines.append(f'{name}.m3u8')

    # Escrever master playlist
    with open(f'{output_dir}/playlist.m3u8', 'w', newline='\n') as f:
        f.write('\n'.join(master_playlist_lines) + '\n')

    logger.info(f"HLS encode concluído: {len(profiles_to_encode)} qualidades")
    return list(profiles_to_encode.keys())


def generate_subtitles(input_file, output_dir):
    """Gera legendas VTT com faster-whisper."""
    from faster_whisper import WhisperModel

    logger.info(f"Carregando modelo Whisper {WHISPER_MODEL}...")
    try:
        model = WhisperModel(WHISPER_MODEL, device='cuda', compute_type='float16')
    except Exception:
        logger.warning("GPU falhou, usando CPU...")
        model = WhisperModel(WHISPER_MODEL, device='cpu', compute_type='int8')

    logger.info("Transcrevendo...")
    segments, info = model.transcribe(
        input_file,
        language=WHISPER_LANGUAGE,
        beam_size=5,
        vad_filter=True,
        vad_parameters=dict(min_silence_duration_ms=500, speech_pad_ms=200),
        word_timestamps=False,
    )

    logger.info(f"Idioma: {info.language} (prob: {info.language_probability:.2f})")

    all_segments = []
    for seg in segments:
        text = seg.text.strip()
        if text:
            all_segments.append({'start': seg.start, 'end': seg.end, 'text': text})

    if not all_segments:
        logger.warning("Nenhum texto detectado")
        return False

    # Gerar VTT
    vtt_path = f'{output_dir}/subtitles_pt.vtt'
    with open(vtt_path, 'w', encoding='utf-8', newline='\n') as f:
        f.write("WEBVTT\nKind: captions\nLanguage: pt-BR\n\n")
        for i, seg in enumerate(all_segments, 1):
            start = format_timestamp(seg['start'])
            end = format_timestamp(seg['end'])
            f.write(f"{i}\n{start} --> {end}\n{seg['text']}\n\n")

    # Gerar subtitles.m3u8
    max_time = max(s['end'] for s in all_segments)
    sub_m3u8 = (
        "#EXTM3U\n#EXT-X-VERSION:3\n"
        f"#EXT-X-TARGETDURATION:{int(max_time) + 1}\n"
        "#EXT-X-MEDIA-SEQUENCE:0\n#EXT-X-PLAYLIST-TYPE:VOD\n"
        f"#EXTINF:{max_time:.3f},\nsubtitles_pt.vtt\n#EXT-X-ENDLIST\n"
    )
    with open(f'{output_dir}/subtitles.m3u8', 'w', newline='\n') as f:
        f.write(sub_m3u8)

    # Patch master playlist
    playlist_path = f'{output_dir}/playlist.m3u8'
    if os.path.isfile(playlist_path):
        with open(playlist_path, 'r') as f:
            content = f.read()
        if 'SUBTITLES' not in content:
            lines = content.split('\n')
            new_lines = []
            for line in lines:
                if line.startswith('#EXT-X-VERSION'):
                    new_lines.append(line)
                    new_lines.append('')
                    new_lines.append('#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="Português",DEFAULT=YES,AUTOSELECT=YES,FORCED=NO,LANGUAGE="pt-BR",URI="subtitles.m3u8"')
                    continue
                if line.startswith('#EXT-X-STREAM-INF:') and 'SUBTITLES=' not in line:
                    line += ',SUBTITLES="subs"'
                new_lines.append(line)
            with open(playlist_path, 'w', newline='\n') as f:
                f.write('\n'.join(new_lines))

    logger.info(f"Legendas: {len(all_segments)} segmentos")
    return True


def format_timestamp(seconds):
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int((seconds - int(seconds)) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d}.{ms:03d}"


def upload_to_r2(local_dir, r2_prefix):
    """Faz upload de todos os arquivos com content-type correto."""
    s3 = get_s3()

    mime_types = {
        '.m3u8': 'application/vnd.apple.mpegurl',
        '.vtt': 'text/vtt',
        '.ts': 'video/mp2t',
    }

    files_uploaded = 0
    for root, dirs, files in os.walk(local_dir):
        for filename in files:
            local_path = os.path.join(root, filename)
            rel_path = os.path.relpath(local_path, local_dir).replace('\\', '/')
            r2_key = f"{r2_prefix}/{rel_path}"
            ext = os.path.splitext(filename)[1].lower()
            content_type = mime_types.get(ext, 'application/octet-stream')

            with open(local_path, 'rb') as f:
                s3.put_object(Bucket=R2_BUCKET, Key=r2_key, Body=f, ContentType=content_type)

            files_uploaded += 1
            if files_uploaded % 50 == 0:
                logger.info(f"Upload progresso: {files_uploaded} arquivos")

    logger.info(f"Upload concluído: {files_uploaded} arquivos")
    return files_uploaded


def process_video(bucket, key):
    """Pipeline completo: download → encode → legendas → upload."""
    s3 = get_s3()

    # Extrair info do path
    # key exemplo: "inbox/Ortopedia/Aula 1.mp4"
    filename = os.path.basename(key)
    basename = os.path.splitext(filename)[0]

    # Determinar path de destino no R2
    # inbox/Pasta/Sub/video.mp4 → videos/Pasta/Sub/video_2160p/
    rel_path = key
    if rel_path.startswith('inbox/'):
        rel_path = rel_path[len('inbox/'):]
    rel_dir = os.path.dirname(rel_path)
    r2_output_prefix = f"videos/{rel_dir}/{basename}" if rel_dir else f"videos/{basename}"

    logger.info(f"Processando: {key}")
    logger.info(f"Destino R2: {r2_output_prefix}")

    import time
    start_time = time.time()

    # Notify backend que o job comecou - admin ve o card "em andamento"
    # em /admin/jobs durante encode/transcribe/upload (pode levar minutos
    # em videos longos). startedAt no DB sera populado por este evento.
    notify_backend({
        'sourceKey': key,
        'destinationKey': r2_output_prefix,
        'status': 'processing',
    })

    with tempfile.TemporaryDirectory() as tmpdir:
        # 1. Download do MP4
        input_file = os.path.join(tmpdir, filename)
        logger.info(f"Baixando {filename}...")
        s3.download_file(R2_BUCKET, key, input_file)
        file_size = os.path.getsize(input_file)
        logger.info(f"Download OK: {file_size / 1024 / 1024:.0f} MB")

        # 2. Encode HLS
        output_dir = os.path.join(tmpdir, 'hls_output')
        logger.info("Iniciando encode HLS...")
        profiles = encode_hls(input_file, output_dir)

        # 3. Legendas
        logger.info("Gerando legendas...")
        generate_subtitles(input_file, output_dir)

        # 4. Upload para R2
        logger.info("Fazendo upload para R2...")
        files_count = upload_to_r2(output_dir, r2_output_prefix)

        # 5. Notificação para o backend NestJS
        duration_sec = time.time() - start_time
        notify_backend({
            'sourceKey': key,
            'destinationKey': r2_output_prefix,
            'status': 'completed',
            'profiles': profiles,
            'durationSec': duration_sec,
            'filesUploaded': files_count,
        })

        # 6. (Opcional) Deletar arquivo do inbox
        # s3.delete_object(Bucket=R2_BUCKET, Key=key)

        return {
            'status': 'completed',
            'source': key,
            'destination': r2_output_prefix,
            'profiles': profiles,
            'files_uploaded': files_count,
            'duration_sec': duration_sec,
        }


# ============================================================================
# HTTP Endpoints
# ============================================================================

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'service': 'video-processor'})


@app.route('/process', methods=['POST'])
def process():
    """Endpoint principal - recebe webhook do Cloudflare Worker."""
    # Verificar autenticação
    auth = request.headers.get('Authorization', '')
    if WEBHOOK_SECRET and auth != f'Bearer {WEBHOOK_SECRET}':
        return jsonify({'error': 'unauthorized'}), 401

    data = request.get_json()
    if not data or 'key' not in data:
        return jsonify({'error': 'key is required'}), 400

    bucket = data.get('bucket', R2_BUCKET)
    key = data['key']

    logger.info(f"Webhook recebido: {key}")

    try:
        result = process_video(bucket, key)
        logger.info(f"Processamento concluído: {result}")
        return jsonify(result)
    except Exception as e:
        logger.error(f"Erro no processamento: {e}", exc_info=True)
        # Notify backend mesmo em falha pra admin ver no /admin/jobs
        try:
            notify_backend({
                'sourceKey': key,
                'status': 'failed',
                'error': str(e)[:1000],
            })
        except Exception:
            pass
        return jsonify({'error': str(e), 'key': key}), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port, debug=True)
