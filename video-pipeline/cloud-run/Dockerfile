# Cloud Run GPU - Video Processor
# ffmpeg (NVENC) + faster-whisper (CUDA) + boto3

FROM nvidia/cuda:12.2.2-devel-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV NVIDIA_VISIBLE_DEVICES=all
ENV NVIDIA_DRIVER_CAPABILITIES=compute,video,utility

# Instalar dependências de build + Python
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    wget \
    yasm \
    nasm \
    pkg-config \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/*

# Compilar ffmpeg com suporte NVENC
# Pinado em n12.1.14.0 (NVENC SDK 12.1) por compat com driver Cloud Run GPU L4 (Found: 12.1)
RUN git clone --branch n12.1.14.0 --depth 1 https://git.videolan.org/git/ffmpeg/nv-codec-headers.git && \
    cd nv-codec-headers && make install && cd .. && rm -rf nv-codec-headers

RUN wget -q https://ffmpeg.org/releases/ffmpeg-7.1.tar.bz2 && \
    tar xjf ffmpeg-7.1.tar.bz2 && \
    cd ffmpeg-7.1 && \
    ./configure \
      --enable-nonfree \
      --enable-cuda-nvcc \
      --enable-libnpp \
      --enable-nvenc \
      --enable-nvdec \
      --enable-cuvid \
      --extra-cflags="-I/usr/local/cuda/include" \
      --extra-ldflags="-L/usr/local/cuda/lib64" \
      --disable-doc \
      --disable-debug \
    && make -j$(nproc) && make install && \
    cd .. && rm -rf ffmpeg-7.1 ffmpeg-7.1.tar.bz2

# Instalar dependencias Python a partir do requirements.txt
# Requests era dep transitiva do faster-whisper em versoes antigas; pinar
# explicitamente em requirements.txt previne ModuleNotFoundError quando
# resolver de pip muda transitivas.
WORKDIR /app
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

# Copiar codigo
COPY . .

# Cloud Run usa a porta 8080
ENV PORT=8080
EXPOSE 8080

# Iniciar com gunicorn (1 worker, timeout longo para vídeos grandes)
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--timeout", "3600", "--workers", "1", "server:app"]
