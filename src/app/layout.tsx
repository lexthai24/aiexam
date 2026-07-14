import type { Metadata } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import "./globals.css";

const notoSansThai = Noto_Sans_Thai({
  variable: "--font-sans-thai",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "ติวสอบ อสพ. | ระบบฝึกทำข้อสอบพร้อมคำอธิบายจาก AI",
  description:
    "ฝึกทำข้อสอบตำแหน่งอาสาพัฒนา (อสพ.) กรมการพัฒนาชุมชน พร้อมคำอธิบายรายข้อจาก AI ที่ช่วยให้จำง่ายและเข้าใจลึก",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={`${notoSansThai.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
