import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Stellar NFT Ticket Platform',
  description: 'NFT Ticket Koleksiyon Platformu - Etkinlik, maç, konser ve müze biletlerinizi NFT olarak oluşturun ve koleksiyonunuzda saklayın',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}