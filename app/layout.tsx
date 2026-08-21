import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import TabNav from "@/components/TabNav";

export const metadata: Metadata = {
  title: "럭키딜",
  description: "경품 응모 이벤트와 핫딜을 한 화면에서",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full">
        <div className="mx-auto max-w-5xl px-4 pb-16 pt-6 sm:px-6">
          <header className="mb-6">
            <Link href="/" className="mb-4 inline-block text-xl font-bold tracking-tight">
              🍀 럭키딜
            </Link>
            <TabNav />
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
