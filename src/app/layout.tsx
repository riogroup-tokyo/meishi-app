import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import { Toaster } from "sonner";
import { AuthProvider } from "@/components/AuthProvider";
import "./globals.css";

const notoSansJP = Noto_Sans_JP({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "名刺管理アプリ - Meishi",
  description: "ビジネスカードをスマートに管理。OCR読み取り、タグ整理、簡単検索。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body className={`${notoSansJP.variable} antialiased`}>
        <AuthProvider>
        {children}
        </AuthProvider>
        <Toaster
          position="bottom-right"
          richColors
          closeButton
          toastOptions={{
            duration: 3000,
          }}
        />
      </body>
    </html>
  );
}
