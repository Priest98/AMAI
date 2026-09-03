import type { Metadata } from "next";
import "@/styles/landing.css";
import HeroLab from "@/components/landing/HeroLab";
export const metadata: Metadata = {
  title: "Oyinca hero directions",
  robots: { index: false, follow: false },
  alternates: { canonical: "https://oyinca.com/hero-lab" },
};
export default function Page() {
  return (
    <main className="amai-landing">
      <HeroLab />
    </main>
  );
}
