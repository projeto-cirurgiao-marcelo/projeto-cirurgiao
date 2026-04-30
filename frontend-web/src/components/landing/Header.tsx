import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, PCButton } from './atoms';

const NAV_LINKS = [
  { label: 'Sobre', href: '#sobre' },
  { label: 'Programa', href: '#programa', active: true },
  { label: 'Mentoria', href: '#mentoria' },
  { label: 'Resultados', href: '#resultados' },
  { label: 'Contato', href: '#contato' },
];

export function LandingHeader() {
  return (
    <header className="pc-header">
      <Link href="/" className="pc-header-brand" aria-label="Projeto Cirurgião — Início">
        <Image
          src="/ProjetoCirurgiaotxt.png"
          alt="Projeto Cirurgião"
          width={1024}
          height={189}
          priority
          style={{ height: 32, width: 'auto', display: 'block' }}
        />
      </Link>

      <nav className="pc-header-nav" aria-label="Navegação principal">
        {NAV_LINKS.map((l) => (
          <a key={l.label} href={l.href} className={l.active ? 'active' : ''}>
            {l.label}
          </a>
        ))}
      </nav>

      <Link href="/login" style={{ textDecoration: 'none' }}>
        <PCButton variant="primary" compact>
          Quero entrar
          <ArrowUpRight />
        </PCButton>
      </Link>
    </header>
  );
}
