import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Image Generator - Create Stunning Art with AI',
  description: 'Generate amazing images from text prompts using advanced AI. Free, fast, and unlimited.',
  keywords: ['AI', 'image generation', 'art', 'AI art', 'text to image'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
