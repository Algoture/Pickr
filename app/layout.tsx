import type { Metadata } from "next";
import { Inter, Andada_Pro } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const geistSans = Andada_Pro({ subsets: ['latin'], variable: '--font-geist', weight: "400" });

export const metadata: Metadata = {
  title: "Pikr | Online Image Color Picker",
  description: "Extract colors from images instantly. The simplest online color picker for designers and developers.",
  keywords: ["image color picker", "extract color from image", "hex code finder", "color palette generator"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body
        className={`${inter.variable} ${geistSans.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
