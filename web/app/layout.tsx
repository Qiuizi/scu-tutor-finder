import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "川大导师速查 | 计算机学院（软件学院）",
  description:
    "四川大学计算机学院（软件学院）导师信息检索：研究方向、职称、联系方式、个人主页，数据来自学院官网与研究生导师名录。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
