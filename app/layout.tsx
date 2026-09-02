import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin", "vietnamese"] });

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;

  return {
    title: "ClubMate — Quản lý đội thể thao",
    description: "Quản lý thành viên, lịch chơi, điểm danh và thu chi cho đội cầu lông, pickleball.",
    metadataBase: new URL(origin),
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: {
      title: "ClubMate — Quản lý đội thể thao",
      description: "Quản lý đội. Lên sân vui hơn.",
      type: "website",
      locale: "vi_VN",
      images: [{ url: `${origin}/og.png`, width: 1200, height: 630, alt: "ClubMate — Quản lý đội. Lên sân vui hơn." }],
    },
    twitter: { card: "summary_large_image", title: "ClubMate", description: "Quản lý đội. Lên sân vui hơn.", images: [`${origin}/og.png`] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body className={inter.variable}>{children}</body></html>;
}
