import type { Metadata, Viewport } from "next";
import { Archivo, Instrument_Serif } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-archivo",
});

const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["italic"],
  display: "swap",
  variable: "--font-instrument",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://playoff30.com"),
  title: {
    default: "PLAYOFF30 — El puesto de mando de tu equipo",
    template: "%s · PLAYOFF30",
  },
  description:
    "PLAYOFF30 reúne convocatorias, asistencia, partidos y comunicación del equipo en un solo sitio. Le dices qué necesitas y lo deja preparado.",
  keywords: [
    "gestión de equipos de fútbol",
    "software fútbol base",
    "convocatorias",
    "asistencia entrenamientos",
    "club de fútbol",
  ],
  openGraph: {
    type: "website",
    locale: "es_ES",
    title: "PLAYOFF30 — El puesto de mando de tu equipo",
    description:
      "Convocatorias, asistencia, partidos y comunicación. En un solo sitio. Hecho para equipos de fútbol.",
    siteName: "PLAYOFF30",
  },
  twitter: {
    card: "summary_large_image",
    title: "PLAYOFF30 — El puesto de mando de tu equipo",
    description: "Convocatorias, asistencia, partidos y comunicación. En un solo sitio.",
  },
};

export const viewport: Viewport = {
  themeColor: "#050a17",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${archivo.variable} ${instrument.variable}`}>
      <body>{children}</body>
    </html>
  );
}
