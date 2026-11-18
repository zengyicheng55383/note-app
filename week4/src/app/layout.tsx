import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import ErrorBanner from "./ErrorBanner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "我的笔记",          // ← 改这里，浏览器标签页会显示
  description: "扫描、整理、复习你的笔记",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ErrorBanner />
        {children}
      </body>
    </html>
  );
}
