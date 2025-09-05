import './globals.css';

export const metadata = {
  title: 'Polymarket FYP',
  description: 'Personalized market feed from your wallet history'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}
