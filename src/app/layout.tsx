import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NotesProvider } from "@/contexts/NotesContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "探究ノート",
  description: "探究活動の記録をつけるノートアプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gray-50">
        <NotesProvider>
          <header className="bg-blue-600 text-white px-6 py-4 shadow">
            <h1 className="text-xl font-bold">
              <a href="/">探究ノート</a>
            </h1>
          </header>
          <main className="flex-1 max-w-4xl w-full mx-auto p-6">
            {children}
          </main>
        </NotesProvider>
      </body>
    </html>
  );
}
