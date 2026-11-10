import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import { AppShell } from "@/components/AppShell/AppShell";
import { Providers } from "@/components/Providers/Providers";
import "./globals.css";

interface RootLayoutProps {
  children: React.ReactNode;
}

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter", 
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "Rewind",
  description: "Trabalho de Gerência de Projeto de Software",
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${poppins.variable}`}>
      <body className={inter.className}>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}