'use client';

import { ArrowUpRight, PCButton, Photo } from './atoms';

export function LandingContact() {
  return (
    <section className="pc-section" style={{ paddingTop: 0 }}>
      <div
        className="pc-card"
        style={{
          position: 'relative',
          overflow: 'hidden',
          padding: '64px 32px',
          textAlign: 'center',
          border: 'none',
        }}
      >
        <Photo
          ratio={null}
          tone="sky"
          label={null}
          src="/landing/tire-duvidas.webp"
          alt="Tire suas dúvidas"
          style={{ position: 'absolute', inset: 0, borderRadius: 24 }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(180deg, rgba(13,26,45,0.45), rgba(13,26,45,0.65))',
              zIndex: 0,
            }}
          />
        </Photo>

        <div
          style={{
            position: 'relative',
            maxWidth: 720,
            margin: '0 auto',
            color: '#fff',
            zIndex: 1,
          }}
        >
          <h2
            className="pc-h-display"
            style={{ fontSize: 'clamp(28px, 3.5vw, 44px)', margin: 0 }}
          >
            Pronto para construir a carreira que você quer?
          </h2>
          <p style={{ fontSize: 15, marginTop: 16, opacity: 0.85 }}>
            15 minutos com um cirurgião do programa. Sem custo, sem
            compromisso.
          </p>

          <form
            style={{
              display: 'flex',
              gap: 8,
              marginTop: 32,
              flexWrap: 'wrap',
              justifyContent: 'center',
              background: 'rgba(255,255,255,0.08)',
              padding: 8,
              borderRadius: 999,
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.15)',
            }}
            onSubmit={(e) => e.preventDefault()}
          >
            <input
              placeholder="Seu nome"
              aria-label="Seu nome"
              style={inputStyle}
            />
            <input
              placeholder="WhatsApp"
              aria-label="WhatsApp"
              style={inputStyle}
            />
            <input
              placeholder="Email"
              aria-label="Email"
              type="email"
              style={{ ...inputStyle, flex: '1 1 200px', minWidth: 180 }}
            />
            <PCButton variant="sky" type="submit">
              Agendar conversa
              <ArrowUpRight />
            </PCButton>
          </form>

          <p style={{ fontSize: 12, opacity: 0.7, marginTop: 16 }}>
            Ao enviar você concorda com nossa política de privacidade.
          </p>
        </div>
      </div>
    </section>
  );
}

const inputStyle: React.CSSProperties = {
  flex: '1 1 160px',
  minWidth: 160,
  padding: '14px 20px',
  border: 'none',
  background: 'transparent',
  color: '#fff',
  fontSize: 14,
  outline: 'none',
  fontFamily: 'inherit',
};
