'use client';

import { AreaHub } from '../_components/area-hub';

/** Hub "Posicionamento e atração" — sketch do cliente: só o grid de módulos */
export default function PosicionamentoHubPage() {
  return (
    <AreaHub
      metaLabel="Biblioteca · Área"
      title="Posicionamento e"
      titleEm="atração"
      sections={[
        {
          type: 'grid',
          courseMatch: /posicionamento/i,
          source: 'modules',
        },
      ]}
    />
  );
}
