'use client';

import { AreaHub } from '../_components/area-hub';

/** Hub "Ortopedia e Neurocirurgias" — sketch do cliente */
export default function OrtopediaNeuroHubPage() {
  return (
    <AreaHub
      metaLabel="Biblioteca · Área"
      title="Ortopedia e"
      titleEm="Neurocirurgias"
      sections={[
        {
          // Grid: Pelve, Membro pélvico, Membro torácico, Neurocirurgias,
          // Anatomia aplicada — módulos de topo do Aprofundamento Ortopedia
          type: 'grid',
          courseMatch: /aprofundamento\s+ortopedia/i,
          source: 'modules',
        },
        {
          type: 'carousel',
          title: 'Ortopedia Na Prática',
          courseMatch: /^ortopedia\s+na\s+pr[aá]tica/i,
          source: 'lessons',
        },
        {
          type: 'carousel',
          title: 'Neurocirurgias Na Prática',
          courseMatch: /^neurocirurgia\s+na\s+pr[aá]tica/i,
          source: 'lessons',
        },
      ]}
    />
  );
}
