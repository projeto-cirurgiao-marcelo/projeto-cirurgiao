'use client';

import { JobsTable } from './_components/jobs-table';

export default function JobsPage() {
  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-atlas-ink dark:text-atlas-ink-2">
          Jobs · Pipeline de vídeo
        </h1>
        <p className="text-sm text-atlas-muted-2">
          Status dos vídeos processados pelo Cloud Run (encode HLS + legendas).
          Atualiza automaticamente; toast notifica conclusão enquanto a página
          está aberta.
        </p>
      </header>
      <JobsTable />
    </div>
  );
}
