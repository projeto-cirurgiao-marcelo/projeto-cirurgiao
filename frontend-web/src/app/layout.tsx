import type { Metadata } from "next";
import "./globals-premium.css";
import { AuthProvider } from "@/components/auth/auth-provider";
import { AtlasToaster } from "@/components/atlas";

export const metadata: Metadata = {
  title: "Projeto Cirurgião - Plataforma de Ensino em Cirurgia Veterinária",
  description: "Plataforma educacional premium para ensino e aprendizado em cirurgia veterinária",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased font-sans">
        <AuthProvider>
          {children}
        </AuthProvider>
        <AtlasToaster />
      </body>
    </html>
  );
}
