import { Arrow, Eyebrow, Photo } from './atoms';

export function LandingPillars() {
  return (
    <section
      id="programa"
      className="pc-section"
      style={{
        background: 'var(--pc-section-alt)',
        borderTop: '1px solid var(--pc-line)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginBottom: 32,
          gap: 24,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ maxWidth: 520 }}>
          <Eyebrow>Como funciona</Eyebrow>
          <h2
            className="pc-h-display"
            style={{
              fontSize: 'clamp(32px, 4vw, 48px)',
              marginTop: 16,
              marginBottom: 0,
            }}
          >
            Três pilares. Um caminho.
          </h2>
        </div>
        <p
          className="pc-muted"
          style={{ maxWidth: 420, fontSize: 15, lineHeight: 1.55, margin: 0 }}
        >
          O programa foi desenhado por cirurgiões veterinários que ainda
          operam — para resolver os problemas reais de quem está construindo
          sua carreira agora.
        </p>
      </div>

      <div className="pc-pillars-grid">
        {/* Pilar 01 — midnight */}
        <div
          className="pc-card"
          style={{
            background: 'var(--pc-midnight)',
            color: '#fff',
            padding: 28,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: 360,
            borderColor: 'transparent',
          }}
        >
          <div>
            <div
              style={{
                width: 40,
                height: 40,
                background: 'rgba(255,255,255,0.08)',
                borderRadius: 12,
                display: 'grid',
                placeItems: 'center',
                marginBottom: 20,
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path d="M12 2v20M2 12h20" />
              </svg>
            </div>
            <div
              style={{
                fontSize: 12,
                color: 'rgba(255,255,255,0.5)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 12,
              }}
            >
              Pilar 01
            </div>
            <h3
              style={{
                fontSize: 22,
                fontWeight: 600,
                lineHeight: 1.25,
                margin: 0,
                letterSpacing: '-0.02em',
              }}
            >
              Técnica cirúrgica baseada em volume e supervisão.
            </h3>
            <p
              style={{
                fontSize: 14,
                color: 'rgba(255,255,255,0.65)',
                lineHeight: 1.55,
                marginTop: 16,
              }}
            >
              Workshops mensais com peças anatômicas, simuladores e cirurgias
              ao vivo comentadas. Você opera, recebe feedback, e opera de
              novo.
            </p>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              color: 'var(--pc-sky)',
            }}
          >
            <span
              style={{
                width: 28,
                height: 16,
                background: 'var(--pc-sky)',
                borderRadius: 999,
                position: 'relative',
                display: 'inline-block',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  right: 2,
                  top: 2,
                  width: 12,
                  height: 12,
                  background: '#fff',
                  borderRadius: '50%',
                }}
              />
            </span>
            Ao vivo · todo mês
          </div>
        </div>

        {/* Pilar 02 — sky photo */}
        <div
          className="pc-card"
          style={{
            padding: 0,
            minHeight: 360,
            position: 'relative',
            overflow: 'hidden',
            borderColor: 'transparent',
          }}
        >
          <Photo
            label={null}
            ratio={null}
            tone="sky"
            src="/landing/imersao-10x.webp"
            alt="Mentoria 1:1 Projeto Cirurgião"
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 24,
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                padding: 28,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                zIndex: 1,
              }}
            >
              <div>
                <span
                  style={{
                    background: 'rgba(13,26,45,0.7)',
                    color: '#fff',
                    padding: '6px 12px',
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 500,
                  }}
                >
                  Pilar 02
                </span>
              </div>
              <div>
                <h3
                  style={{
                    fontSize: 28,
                    fontWeight: 600,
                    color: '#fff',
                    margin: 0,
                    letterSpacing: '-0.02em',
                  }}
                >
                  Mentoria 1:1
                </h3>
                <p
                  style={{
                    fontSize: 13,
                    color: 'rgba(255,255,255,0.85)',
                    maxWidth: 280,
                    marginTop: 8,
                    lineHeight: 1.5,
                  }}
                >
                  Cirurgiões de referência te acompanham em metas trimestrais
                  — carreira, casuística, primeiro consultório, primeiras
                  cirurgias autorais.
                </p>
              </div>
            </div>
          </Photo>
        </div>

        {/* Pilar 03 — frost stat */}
        <div
          className="pc-card"
          style={{
            background: 'var(--pc-frost)',
            padding: 28,
            minHeight: 360,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: 'var(--pc-slate)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: 12,
            }}
          >
            Pilar 03
          </div>
          <h3
            style={{
              fontSize: 22,
              fontWeight: 600,
              lineHeight: 1.25,
              margin: 0,
              letterSpacing: '-0.02em',
            }}
          >
            Discussão de casos.
          </h3>
          <div style={{ marginTop: 20 }}>
            <div
              style={{
                fontSize: 56,
                fontWeight: 600,
                color: 'var(--pc-sky-strong)',
                letterSpacing: '-0.03em',
                lineHeight: 1,
              }}
            >
              + 8.400
            </div>
            <div
              style={{
                fontSize: 13,
                color: 'var(--pc-slate)',
                marginTop: 6,
              }}
            >
              casos discutidos em comunidade
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 6,
              marginTop: 24,
              flexWrap: 'wrap',
            }}
          >
            {[
              'Tecidos Moles',
              'Ortopedia',
              'Oncológica',
              'Oftalmo',
              'Trauma',
              'Reprodução',
            ].map((t) => (
              <span
                key={t}
                style={{
                  fontSize: 11,
                  padding: '6px 10px',
                  borderRadius: 999,
                  background: '#fff',
                  border: '1px solid var(--pc-line)',
                  color: 'var(--pc-slate)',
                }}
              >
                {t}
              </span>
            ))}
          </div>

          <div
            style={{
              marginTop: 'auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: 24,
              borderTop: '1px solid var(--pc-line)',
            }}
          >
            <span style={{ fontSize: 13, color: 'var(--pc-slate)' }}>
              Ver biblioteca →
            </span>
            <button
              type="button"
              aria-label="Ver biblioteca"
              style={{
                width: 36,
                height: 36,
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
        </div>
      </div>
    </section>
  );
}
