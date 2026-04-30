const STATS: Array<[string, string]> = [
  ['12.000+', 'Horas de mentoria registradas'],
  ['89%', 'Aprovação em primeira tentativa'],
  ['10.000+', 'Veterinários ativos na comunidade'],
  ['125+', 'Eventos e workshops por ano'],
];

export function LandingStatsStrip() {
  return (
    <section
      style={{
        padding: '32px 56px 56px',
        borderTop: '1px solid var(--pc-line)',
      }}
    >
      <div
        className="pc-center pc-muted"
        style={{ fontSize: 13, marginBottom: 24 }}
      >
        Alguns dos nossos números
      </div>
      <div className="pc-stats-grid">
        {STATS.map(([n, l]) => (
          <div key={n} className="pc-center">
            <div
              style={{
                fontSize: 'clamp(28px, 3vw, 42px)',
                fontWeight: 600,
                letterSpacing: '-0.02em',
              }}
            >
              {n}
            </div>
            <div
              style={{
                fontSize: 13,
                color: 'var(--pc-slate)',
                marginTop: 4,
              }}
            >
              {l}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
