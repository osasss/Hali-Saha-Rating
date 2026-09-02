import './globals.css';

export const metadata = {
  title: 'Maç Sonu Puanlama',
  description: 'Futbol maçlarından sonra oyuncuların birbirini puanladığı uygulama',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
