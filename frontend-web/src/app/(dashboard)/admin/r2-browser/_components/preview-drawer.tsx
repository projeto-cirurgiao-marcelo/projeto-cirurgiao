'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Loader2 } from 'lucide-react';
import { cdnUrl, playlistKeyFor } from '@/lib/api/r2-browser.service';
import { CopyCdnLink } from './copy-cdn-link';

const HlsVideoPlayer = dynamic(
  () => import('@/components/video-player/hls-video-player'),
  {
    ssr: false,
    loading: () => (
      <div className="flex aspect-video items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    ),
  },
);

interface PreviewDrawerProps {
  open: boolean;
  folder: string | null;
  onClose: () => void;
}

export function PreviewDrawer({ open, folder, onClose }: PreviewDrawerProps) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (open && folder) {
      setSrc(cdnUrl(playlistKeyFor(folder)));
    } else {
      setSrc(null);
    }
  }, [open, folder]);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto sm:max-w-2xl"
      >
        <SheetHeader>
          <SheetTitle>Preview HLS</SheetTitle>
          <SheetDescription className="break-all font-mono text-xs">
            {folder ?? '—'}
          </SheetDescription>
        </SheetHeader>

        {src && (
          <div className="mt-4 space-y-3">
            <div className="overflow-hidden rounded-lg bg-black">
              <HlsVideoPlayer src={src} />
            </div>
            <div className="flex flex-wrap gap-2">
              <CopyCdnLink url={src} label="Copiar URL playlist.m3u8" />
              {folder && (
                <CopyCdnLink
                  url={cdnUrl(`${folder.replace(/\/+$/, '')}/subtitles_pt.vtt`)}
                  label="Copiar VTT pt-BR"
                />
              )}
            </div>
            <p className="text-xs text-atlas-muted-2">
              Cole o link da playlist no campo <code>videoUrl</code> ao criar
              um curso. Source = <code>r2_hls</code>.
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
