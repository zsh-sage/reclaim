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
  title: "GLM SMART",
  description: "Smart Reimbursement Automation System",
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
