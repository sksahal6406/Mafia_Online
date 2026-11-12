import { Fredoka, Nunito } from 'next/font/google';
import './globals.css';

const fredoka = Fredoka({ subsets: ['latin'], variable: '--font-fredoka', display: 'swap' });
const nunito = Nunito({ subsets: ['latin'], variable: '--font-nunito', display: 'swap' });

export const metadata = {
  title: 'Mafia Overseas',
  description: 'Play Mafia online with your friends, with live video.',
};

export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#09090d' };

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${fredoka.variable} ${nunito.variable}`}>
      <body>{children}</body>
    </html>
  );
}
