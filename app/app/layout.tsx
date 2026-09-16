import type { Metadata } from "next";
import "../app-ui.css";
import { SesionProvider } from "@/lib/app/sesion";
import AppShell from "@/components/app/AppShell";

export const metadata: Metadata = {
  title: "Demo",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SesionProvider>
      <AppShell>{children}</AppShell>
    </SesionProvider>
  );
}
