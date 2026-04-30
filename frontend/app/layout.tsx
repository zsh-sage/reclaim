import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google"; // Import fonts
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext"; // Import AuthProvider

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body", // Assign to --font-body
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-headline", // Assign to --font-headline
});

export const metadata: Metadata = {
  title: "Reclaim",
  description: "Every receipt reviewed. Every decision yours. Smart Reimbursement Automation System",
  icons: {
    icon: "/images/logo.svg",
  },
  openGraph: {
    title: "Reclaim",
    description: "Every receipt reviewed. Every decision yours. Smart Reimbursement Automation System",
    images: [
      {
        url: "/images/logo.svg",
        width: 800,
        height: 600,
        alt: "Reclaim Logo",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Reclaim",
    description: "Every receipt reviewed. Every decision yours. Smart Reimbursement Automation System",
    images: ["/images/logo.svg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${plusJakartaSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
