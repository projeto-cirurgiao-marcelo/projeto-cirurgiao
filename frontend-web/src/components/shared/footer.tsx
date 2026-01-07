'use client';

import Link from 'next/link';
import {
  GraduationCap,
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Youtube,
  Mail,
  Phone,
  MapPin,
} from 'lucide-react';

const footerLinks = {
  plataforma: [
    { label: 'Sobre Nós', href: '/about' },
    { label: 'Como Funciona', href: '/how-it-works' },
    { label: 'Cursos', href: '/courses' },
    { label: 'Instrutores', href: '/instructors' },
    { label: 'Blog', href: '/blog' },
  ],
  suporte: [
    { label: 'Central de Ajuda', href: '/help' },
    { label: 'Contato', href: '/contact' },
    { label: 'FAQ', href: '/faq' },
    { label: 'Certificados', href: '/certificates' },
    { label: 'Status do Sistema', href: '/status' },
  ],
  legal: [
    { label: 'Termos de Uso', href: '/terms' },
    { label: 'Política de Privacidade', href: '/privacy' },
    { label: 'Política de Cookies', href: '/cookies' },
    { label: 'Acessibilidade', href: '/accessibility' },
  ],
};

const socialLinks = [
  { icon: Facebook, href: '#', label: 'Facebook', color: '#1877F2' },
  { icon: Instagram, href: '#', label: 'Instagram', color: '#E4405F' },
  { icon: Twitter, href: '#', label: 'Twitter', color: '#1DA1F2' },
  { icon: Linkedin, href: '#', label: 'LinkedIn', color: '#0A66C2' },
  { icon: Youtube, href: '#', label: 'YouTube', color: '#FF0000' },
];

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-muted/30 mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center space-x-2 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[rgb(var(--primary-500))] text-white shadow-lg">
                <GraduationCap className="h-6 w-6" />
              </div>
              <span className="font-bold text-lg bg-gradient-to-r from-[rgb(var(--primary-600))] to-[rgb(var(--primary-400))] bg-clip-text text-transparent">
                Projeto Cirurgião
              </span>
            </Link>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm">
              Plataforma educacional dedicada ao ensino de excelência em Medicina
              Veterinária. Aprenda com os melhores profissionais através de conteúdo
              prático e atualizado.
            </p>

            {/* Contact Info */}
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-[rgb(var(--primary-500))]" />
                <a
                  href="mailto:contato@projetocirurgiao.com.br"
                  className="hover:text-[rgb(var(--primary-500))] transition-colors"
                >
                  contato@projetocirurgiao.com.br
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-[rgb(var(--primary-500))]" />
                <a
                  href="tel:+5511999999999"
                  className="hover:text-[rgb(var(--primary-500))] transition-colors"
                >
                  +55 (11) 99999-9999
                </a>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-[rgb(var(--primary-500))] mt-0.5" />
                <span>São Paulo, SP - Brasil</span>
              </div>
            </div>
          </div>

          {/* Plataforma Links */}
          <div>
            <h3 className="font-semibold text-sm mb-4 text-foreground">Plataforma</h3>
            <ul className="space-y-3">
              {footerLinks.plataforma.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-[rgb(var(--primary-500))] transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Suporte Links */}
          <div>
            <h3 className="font-semibold text-sm mb-4 text-foreground">Suporte</h3>
            <ul className="space-y-3">
              {footerLinks.suporte.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-[rgb(var(--primary-500))] transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="font-semibold text-sm mb-4 text-foreground">Legal</h3>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-[rgb(var(--primary-500))] transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Social Links */}
        <div className="mt-12 pt-8 border-t border-border">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-muted hover:bg-[rgb(var(--primary-500))] text-muted-foreground hover:text-white transition-all hover:scale-110 hover:shadow-lg"
                    aria-label={social.label}
                  >
                    <Icon className="h-5 w-5" />
                  </a>
                );
              })}
            </div>

            <p className="text-sm text-muted-foreground text-center md:text-right">
              © {currentYear} Projeto Cirurgião. Todos os direitos reservados.
            </p>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            Desenvolvido com{' '}
            <span className="text-[rgb(var(--error))]">❤️</span> para veterinários que
            buscam excelência.
          </p>
        </div>
      </div>
    </footer>
  );
}
