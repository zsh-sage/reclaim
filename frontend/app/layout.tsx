import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google"; // Import fonts
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext"; // Import AuthProvider
import ServiceWorkerRegistration from "./_components/ServiceWorkerRegistration";
import PushNotificationProvider from "./_components/PushNotificationProvider";
import PushPermissionPrompt from "./_components/PushPermissionPrompt";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body", // Assign to --font-body
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-headline", // Assign to --font-headline
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-visual",
  themeColor: "#f5f7f9",
};

export const metadata: Metadata = {
  title: "Reclaim",
  description: "Every receipt reviewed. Every decision yours. Smart Reimbursement Automation System",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Reclaim",
  },
  icons: {
    icon: "/images/logo.svg",
    apple: "/icons/apple-touch-icon.png",
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
        <AuthProvider>
          <PushNotificationProvider>
            {children}
            <PushPermissionPrompt />
            <ServiceWorkerRegistration />
          </PushNotificationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
