import type { Metadata, Viewport } from "next"
import { Anton, Oswald, PT_Serif } from "next/font/google"
import { Toaster } from "sonner"
import { NOME_DO_SITE, urlDoSite } from "@/lib/site"
import "./globals.css"

const anton = Anton({ variable: "--font-anton", weight: "400", subsets: ["latin"] })
const oswald = Oswald({ variable: "--font-oswald", weight: ["400", "500", "600", "700"], subsets: ["latin"] })
const ptSerif = PT_Serif({ variable: "--font-pt-serif", weight: ["400", "700"], style: ["normal", "italic"], subsets: ["latin"] })

const DESCRICAO = "Classificados por cidade, no formato do caderno de jornal. Anuncie por R$ 1,00 a semana."

export const metadata: Metadata = {
  metadataBase: new URL(urlDoSite()),
  title: { default: NOME_DO_SITE, template: `%s | ${NOME_DO_SITE}` },
  description: DESCRICAO,
  openGraph: { type: "website", locale: "pt_BR", siteName: NOME_DO_SITE, title: NOME_DO_SITE, description: DESCRICAO },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = { themeColor: "#f4f1e8", width: "device-width", initialScale: 1 }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className={`${anton.variable} ${oswald.variable} ${ptSerif.variable} min-h-dvh`}>
        {children}
        <Toaster position="top-center" closeButton toastOptions={{ style: { borderRadius: 0, border: "1px solid #141412", fontFamily: "var(--font-texto)" } }} />
      </body>
    </html>
  )
}
