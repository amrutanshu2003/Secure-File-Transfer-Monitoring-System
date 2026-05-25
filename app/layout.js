export const metadata = {
  title: "Secure File Transfer Monitoring",
  description: "Vercel-ready monitoring dashboard with DB-backed logs and alerts"
};

import "./globals.css";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
