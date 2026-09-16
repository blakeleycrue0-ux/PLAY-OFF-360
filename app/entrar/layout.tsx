import type { Metadata } from "next";
import "../app-ui.css";

export const metadata: Metadata = {
  title: "Entrar",
  description: "Accede a tu equipo en PLAYOFF30.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
