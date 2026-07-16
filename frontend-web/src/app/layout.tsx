import type { Metadata } from "next";
import "./globals-premium.css";
import { ThemeProvider } from "next-themes";
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
    // suppressHydrationWarning: next-themes injeta a classe do tema no <html> antes da hidratação
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="antialiased font-sans">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          <AuthProvider>
            {children}
          </AuthProvider>
          <AtlasToaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
