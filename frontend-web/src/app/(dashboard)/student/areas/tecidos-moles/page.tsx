'use client';

import { AreaHub } from '../_components/area-hub';

/** Hub "Cirurgias de tecidos moles" — sketch do cliente (slide 52) */
export default function TecidosMolesHubPage() {
  return (
    <AreaHub
      metaLabel="Biblioteca · Área"
      title="Cirurgias de"
      titleEm="tecidos moles"
      sections={[
        {
          type: 'carousel',
          title: 'Treinamentos Pós graduação',
          courseMatch: /p[oó]s\s*gradua/i,
          source: 'modules',
        },
        {
          // Grid central sem título, fiel ao sketch
          type: 'grid',
          courseMatch: /aprofundamento\s+tecidos\s+moles/i,
          source: 'modules',
        },
        {
          type: 'carousel',
          title: 'Treinamentos Premium',
          courseMatch: /treinamentos\s+premium/i,
          source: 'modules',
        },
        {
          type: 'carousel',
          title: 'Tecidos Moles Na Prática',
          courseMatch: /tecidos\s+moles\s+na\s+pr[aá]tica/i,
          source: 'lessons',
        },
      ]}
    />
  );
}
