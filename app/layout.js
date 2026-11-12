import './globals.css';

export const metadata = {
  title: 'Mafia Overseas',
  description: 'Play Mafia online with your friends, with live video.',
};

export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#09090d' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
