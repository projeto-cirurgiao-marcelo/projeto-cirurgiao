import { Arrow, Eyebrow, Photo } from './atoms';

const TRACKS = [
  {
    tag: 'Trilha Residente',
    title: 'Da graduação à primeira cirurgia autoral.',
    tone: 'warm' as const,
    src: '/landing/curso-tecidos-moles.webp',
    alt: 'Trilha Residente — Tecidos Moles',
  },
  {
    tag: 'Trilha Plantonista',
    title: 'Construa raciocínio e confiança em emergências.',
    tone: 'sky' as const,
    src: '/landing/curso-top10.webp',
    alt: 'Trilha Plantonista — Top 10 Cirurgias',
  },
  {
    tag: 'Trilha Cirurgião Pleno',
    title: 'Posicionamento, casuística e construção de carreira.',
    tone: 'cool' as const,
    src: '/landing/aprenda-aplique.webp',
    alt: 'Trilha Cirurgião Pleno — Carreira',
  },
];

export function LandingTracks() {
  return (
    <section
      id="mentoria"
      className="pc-section"
      style={{ background: 'var(--pc-section-alt-2)' }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          gap: 24,
        }}
      >
        <Eyebrow>Trilhas</Eyebrow>
        <p
          style={{
            maxWidth: 520,
            fontSize: 15,
            lineHeight: 1.55,
            color: 'var(--pc-midnight)',
            margin: 0,
          }}
        >
          Um programa que se adapta a você — não o contrário. Veja a trilha
          pensada para o seu momento da carreira e o que esperar de cada uma.
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 12,
          justifyContent: 'flex-end',
          marginTop: 24,
        }}
      >
        <button
          type="button"
          aria-label="Anterior"
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: '#fff',
            border: '1px solid var(--pc-line)',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          ←
        </button>
        <button
          type="button"
          aria-label="Próximo"
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'var(--pc-sky)',
            color: '#fff',
            display: 'grid',
            placeItems: 'center',
            border: 'none',
          }}
        >
          <Arrow size={14} />
        </button>
      </div>

      <div className="pc-tracks-grid">
        {TRACKS.map((t) => (
          <div
            key={t.tag}
            className="pc-card"
            style={{ padding: 0, overflow: 'hidden', border: 'none' }}
          >
            <Photo
              ratio="4 / 4.2"
              tone={t.tone}
              label={null}
              src={t.src}
              alt={t.alt}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 16,
                  left: 16,
                  zIndex: 1,
                }}
              >
                <span
                  style={{
                    background: 'rgba(255,255,255,0.85)',
                    backdropFilter: 'blur(6px)',
                    WebkitBackdropFilter: 'blur(6px)',
                    padding: '6px 12px',
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--pc-midnight)',
                  }}
                >
                  {t.tag}
                </span>
              </div>
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 1,
                  padding: '40px 20px 20px',
                  background:
                    'linear-gradient(180deg, transparent, rgba(0,0,0,0.55))',
                }}
              >
                <h4
                  style={{
                    color: '#fff',
                    fontSize: 18,
                    fontWeight: 600,
                    margin: 0,
                    lineHeight: 1.3,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {t.title}
                </h4>
              </div>
            </Photo>
          </div>
        ))}
      </div>
    </section>
  );
}
