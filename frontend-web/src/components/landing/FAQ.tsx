'use client';

import * as React from 'react';
import { Arrow, Eyebrow, Minus, PCButton, Plus } from './atoms';

const ITEMS = [
  {
    q: 'Para quem é o Projeto Cirurgião?',
    a: 'Para estudantes de veterinária no internato, recém-formados e cirurgiões plenos que querem método, mentoria e comunidade. Não é necessário ter experiência prévia em algum subgrupo específico.',
  },
  {
    q: 'Como funciona a mentoria 1:1?',
    a: 'Você é pareado com um cirurgião veterinário de referência da sua área. Encontros quinzenais de 45min, metas trimestrais e canal direto via WhatsApp para dúvidas urgentes.',
  },
  {
    q: 'Quanto tempo dura o programa?',
    a: 'O programa-base é anual, com renovação opcional. Mas você acessa a comunidade e a biblioteca de casos por toda a duração.',
  },
  {
    q: 'Posso conciliar com a clínica?',
    a: 'Sim. A maior parte do conteúdo é assíncrono. Os encontros ao vivo acontecem fora dos horários de atendimento padrão e ficam gravados.',
  },
  {
    q: 'Como é o processo de seleção?',
    a: 'Conversamos primeiro. Não é prova — é entender seu momento, suas metas e ver se nosso método cabe na sua rotina. 90% dos candidatos são aceitos.',
  },
  {
    q: 'Vocês emitem certificado?',
    a: 'Sim. Certificação de 480h reconhecida por sociedades parceiras, válida para currículo e progressões institucionais.',
  },
];

export function LandingFAQ() {
  const [open, setOpen] = React.useState(0);

  return (
    <section
      id="contato"
      className="pc-section"
      style={{ borderTop: '1px solid var(--pc-line)' }}
    >
      <div className="pc-faq-grid">
        <div>
          <Eyebrow>FAQ</Eyebrow>
          <h2
            className="pc-h-display"
            style={{ fontSize: 'clamp(32px, 4vw, 48px)', marginTop: 16 }}
          >
            Reunimos as
            <br />
            perguntas mais
            <br />
            comuns aqui.
          </h2>
          <p
            className="pc-muted"
            style={{
              fontSize: 15,
              lineHeight: 1.55,
              maxWidth: 380,
            }}
          >
            Não achou o que procurava? Fale direto com a gente. Respondemos em
            até 24h úteis.
          </p>
          <PCButton variant="sky" style={{ marginTop: 20 }}>
            Falar com a equipe
            <Arrow />
          </PCButton>
        </div>

        <div>
          {ITEMS.map((it, i) => (
            <div key={it.q} style={{ borderBottom: '1px solid var(--pc-line)' }}>
              <button
                type="button"
                onClick={() => setOpen(open === i ? -1 : i)}
                aria-expanded={open === i}
                style={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '22px 0',
                  textAlign: 'left',
                  fontSize: 16,
                  fontWeight: 500,
                  color: 'var(--pc-midnight)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <span>{it.q}</span>
                <span
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: open === i ? 'var(--pc-sky)' : '#F2F6FA',
                    color: open === i ? '#fff' : 'var(--pc-midnight)',
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  {open === i ? <Minus /> : <Plus />}
                </span>
              </button>
              {open === i && (
                <p
                  style={{
                    fontSize: 14,
                    color: 'var(--pc-slate)',
                    lineHeight: 1.6,
                    paddingBottom: 22,
                    paddingRight: 60,
                    margin: 0,
                  }}
                >
                  {it.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
