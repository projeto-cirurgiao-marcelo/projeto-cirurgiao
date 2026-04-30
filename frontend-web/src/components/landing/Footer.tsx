import { Arrow, PCButton } from './atoms';

const SOCIAL_LINKS = [
  { label: 'Instagram', href: 'https://instagram.com/oprojetocirurgiao' },
  { label: 'YouTube', href: 'https://youtube.com/@oprojetocirurgiao' },
  { label: 'LinkedIn', href: '#' },
  { label: 'Spotify', href: '#' },
];

export function LandingFooter() {
  return (
    <div className="pc-footer-band">
      <div className="pc-footer-row">
        <div style={{ maxWidth: 360 }}>
          <p
            style={{
              fontSize: 15,
              lineHeight: 1.55,
              margin: 0,
              color: 'rgba(255,255,255,0.78)',
            }}
          >
            Junte-se a uma comunidade de cirurgiões veterinários que estão
            construindo carreiras de excelência — com método, mentoria e
            propósito.
          </p>
          <PCButton variant="sky" style={{ marginTop: 20 }}>
            Agendar conversa
            <Arrow />
          </PCButton>
        </div>

        <div>
          <div
            style={{
              fontSize: 12,
              color: 'rgba(255,255,255,0.6)',
              marginBottom: 12,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            Siga
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {SOCIAL_LINKS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '8px 16px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 999,
                  fontSize: 13,
                  background: 'rgba(255,255,255,0.04)',
                }}
              >
                {s.label}
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="pc-footer-mark">
        Projeto
        <br />
        Cirurgião.
      </div>

      <div className="pc-footer-fineprint">
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          <div>
            <div style={{ marginBottom: 8, color: 'rgba(255,255,255,0.4)' }}>
              Conteúdo
            </div>
            <div>Sobre · Programa · Casos · Blog</div>
          </div>
          <div>
            <div style={{ marginBottom: 8, color: 'rgba(255,255,255,0.4)' }}>
              Contato
            </div>
            <div>
              contato@projetocirurgiao.com
              <br />
              WhatsApp · Seg–Sex 9h–18h
            </div>
          </div>
        </div>
        <div style={{ alignSelf: 'flex-end' }}>
          <span>© {new Date().getFullYear()} Projeto Cirurgião</span>
          <span style={{ margin: '0 12px' }}>·</span>
          <a href="/privacy">Privacidade</a>
        </div>
      </div>
    </div>
  );
}
