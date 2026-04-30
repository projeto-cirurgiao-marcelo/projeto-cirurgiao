import { Photo, Spark, PCButton } from './atoms';

const HERO_STATS: Array<[string, string]> = [
  ['10.000+', 'Veterinários formados'],
  ['200h+', 'De conteúdo cirúrgico'],
  ['98%', 'Recomendam a colegas'],
];

export function LandingHero() {
  return (
    <section className="pc-section pc-hero" style={{ paddingTop: 32 }}>
      <button
        type="button"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          color: 'var(--pc-slate)',
          fontSize: 13,
          padding: '6px 14px',
          border: '1px solid var(--pc-line)',
          borderRadius: 999,
          background: '#fff',
          marginBottom: 32,
        }}
      >
        <span style={{ display: 'inline-block', transform: 'translateY(-1px)' }}>
          ←
        </span>{' '}
        Edição 2026 · Inscrições abertas
      </button>

      <div className="pc-hero-grid">
        <Photo
          ratio="4 / 4.6"
          tone="sky"
          src="/landing/hero-marcelo.webp"
          alt="Prof. Marcelo Portilho — fundador do Projeto Cirurgião"
          objectPosition="center top"
        >
          <div
            style={{
              position: 'absolute',
              top: 24,
              right: 24,
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.5)',
              display: 'grid',
              placeItems: 'center',
              color: 'var(--pc-sky-strong)',
              zIndex: 1,
            }}
          >
            <Spark size={20} />
          </div>
        </Photo>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '8px 0',
          }}
        >
          <div>
            <div
              style={{
                fontSize: 13,
                color: 'var(--pc-slate)',
                marginBottom: 16,
                fontWeight: 500,
              }}
            >
              Mentoria & formação para cirurgiões veterinários
            </div>
            <h1
              className="pc-h-display"
              style={{ fontSize: 'clamp(40px, 5.2vw, 72px)', margin: 0 }}
            >
              Construa a carreira
              <br />
              <span style={{ color: 'var(--pc-sky)' }}>cirúrgica</span>
              <br />
              que você imaginou.
            </h1>

            <p
              className="pc-muted"
              style={{
                fontSize: 16,
                lineHeight: 1.55,
                marginTop: 28,
                maxWidth: 520,
              }}
            >
              Mentoria, comunidade e treinamento prático para residentes e
              cirurgiões veterinários que não querem caminhar sozinhos. Método
              validado, acompanhamento de perto, evolução visível em meses —
              não em anos.
            </p>
          </div>

          <div
            style={{
              marginTop: 40,
              padding: 28,
              background: 'var(--pc-frost)',
              border: '1px solid var(--pc-line)',
              borderRadius: 24,
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 24,
              }}
            >
              {HERO_STATS.map(([n, l]) => (
                <div key={n}>
                  <div
                    style={{
                      fontSize: 32,
                      fontWeight: 600,
                      color: 'var(--pc-sky-strong)',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {n}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--pc-slate)',
                      marginTop: 4,
                      lineHeight: 1.4,
                    }}
                  >
                    {l}
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                display: 'flex',
                gap: 14,
                alignItems: 'center',
                marginTop: 24,
                flexWrap: 'wrap',
              }}
            >
              <PCButton variant="primary">Agendar conversa</PCButton>
              <div
                style={{
                  fontSize: 13,
                  color: 'var(--pc-slate)',
                  maxWidth: 220,
                  lineHeight: 1.4,
                }}
              >
                15 minutos · sem compromisso · com um cirurgião do programa
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
