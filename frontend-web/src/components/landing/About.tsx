import { Eyebrow, Photo } from './atoms';

export function LandingAbout() {
  return (
    <section
      id="sobre"
      className="pc-section"
      style={{
        borderTop: '1px solid var(--pc-line)',
        paddingTop: 64,
        paddingBottom: 64,
      }}
    >
      <div className="pc-about-grid">
        <Eyebrow style={{ alignSelf: 'flex-start' }}>Sobre o projeto</Eyebrow>
        <div>
          <p
            style={{
              fontSize: 26,
              lineHeight: 1.35,
              margin: 0,
              letterSpacing: '-0.01em',
              textWrap: 'pretty',
            }}
          >
            Acreditamos que ser um bom cirurgião veterinário é mais do que
            dominar a técnica — é{' '}
            <strong>desenvolver julgamento, presença e propósito</strong>.
            Nosso trabalho é caminhar lado a lado com você, do primeiro
            atendimento à primeira cirurgia complexa, oferecendo o suporte
            que faltou em quase todas as graduações.
          </p>
        </div>
      </div>

      <div className="pc-about-photos">
        <Photo
          label="Tecidos Moles"
          ratio="1 / 1"
          tone="warm"
          src="/landing/curso-tecidos-moles.webp"
          alt="Curso Tecidos Moles na Prática"
        />
        <Photo
          label="Top 10 Cirurgias"
          ratio="1 / 1"
          tone="sky"
          src="/landing/curso-top10.webp"
          alt="Top 10 Cirurgias de Rotina"
        />
        <Photo
          label="Treinamento prático"
          ratio="1 / 1"
          tone="cool"
          src="/landing/imersao-ref.webp"
          alt="Imersão Presencial"
        />
        <Photo label="Comunidade" ratio="1 / 1" tone="midnight">
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              placeItems: 'center',
              color: '#fff',
              fontSize: 13,
              opacity: 0.7,
              zIndex: 1,
            }}
          >
            + 10.000 veterinários
          </div>
        </Photo>
      </div>
    </section>
  );
}
