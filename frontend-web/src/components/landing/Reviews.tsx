'use client';

import * as React from 'react';
import { Arrow, Photo, StarIcon } from './atoms';

const WORDS = ['Mudança real', 'Transformador', 'Confiança', 'Acolhedor'];

const REVIEWS = [
  {
    name: 'Dra. Marina Lopes',
    role: 'Clínica de Pequenos Animais · São Paulo',
    rating: 4.9,
    body: 'A discussão semanal de casos mudou meu olhar clínico. Cheguei na minha primeira cirurgia complexa segura, com plano A, B e C — e com um WhatsApp para chamar se precisasse.',
  },
];

export function LandingReviews() {
  const [active, setActive] = React.useState(1);
  const review = REVIEWS[0];

  return (
    <section
      id="resultados"
      className="pc-section"
      style={{ borderTop: '1px solid var(--pc-line)' }}
    >
      <div
        className="pc-card"
        style={{ position: 'relative', overflow: 'hidden', minHeight: 460, border: 'none' }}
      >
        <Photo
          ratio={null}
          tone="midnight"
          label={null}
          src="/landing/banner-pos.webp"
          alt="Pós-graduação Projeto Cirurgião"
          style={{ position: 'absolute', inset: 0, borderRadius: 24 }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(90deg, rgba(13,26,45,0.7) 30%, rgba(13,26,45,0.2) 100%)',
              zIndex: 0,
            }}
          />
        </Photo>

        <div className="pc-reviews-grid" style={{ zIndex: 1 }}>
          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              padding: 32,
              alignSelf: 'flex-start',
            }}
          >
            <span
              style={{
                fontSize: 11,
                color: 'var(--pc-slate)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              Depoimentos
            </span>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 18,
                marginTop: 24,
              }}
            >
              {WORDS.map((w, i) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setActive(i)}
                  style={{
                    textAlign: 'left',
                    fontSize: i === active ? 30 : 26,
                    fontWeight: i === active ? 600 : 400,
                    color: i === active ? 'var(--pc-midnight)' : 'rgba(13,26,45,0.4)',
                    letterSpacing: '-0.02em',
                    transition: 'all .2s',
                    padding: 0,
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              color: '#fff',
              alignItems: 'flex-end',
              textAlign: 'right',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 'clamp(56px, 7vw, 96px)',
                  fontWeight: 600,
                  letterSpacing: '-0.04em',
                  lineHeight: 1,
                }}
              >
                4.9
              </div>
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                Avaliação geral · 412 reviews
              </div>
            </div>

            <div style={{ maxWidth: 480 }}>
              <p style={{ fontSize: 15, lineHeight: 1.55, fontStyle: 'italic' }}>
                &ldquo;{review.body}&rdquo;
              </p>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: 12,
                  marginTop: 16,
                }}
              >
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 600 }}>{review.name}</div>
                  <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>
                    {review.role}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      gap: 2,
                      justifyContent: 'flex-end',
                      color: '#FFC857',
                      marginTop: 4,
                    }}
                  >
                    {[1, 2, 3, 4, 5].map((i) => (
                      <StarIcon key={i} size={12} />
                    ))}
                  </div>
                </div>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: '#fff',
                    overflow: 'hidden',
                  }}
                >
                  <Photo
                    ratio="1 / 1"
                    tone="warm"
                    label={null}
                    src="/landing/instructors/dra-renata.webp"
                    alt="Avatar"
                  />
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  justifyContent: 'flex-end',
                  marginTop: 20,
                }}
              >
                <button
                  type="button"
                  aria-label="Anterior"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.15)',
                    border: '1px solid rgba(255,255,255,0.25)',
                    color: '#fff',
                  }}
                >
                  ←
                </button>
                <button
                  type="button"
                  aria-label="Próximo"
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
        </div>
      </div>
    </section>
  );
}
