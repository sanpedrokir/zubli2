import { Fraunces, Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import "./globals.css";

const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], display: "swap" });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });

export const metadata = {
  title: {
    default: "Zubli Reconnect — Some friendships deserve a second hello.",
    template: "%s · Zubli Reconnect",
  },
  description:
    "Reconnect with childhood friends, classmates, neighbours and colleagues you lost touch with. Private by default, consent-first introductions.",
};

const clerkAppearance = {
  variables: {
    colorPrimary: "#b85c38",
    colorText: "#2f2a25",
    colorBackground: "#ffffff",
    borderRadius: "1rem",
    fontFamily: "var(--font-inter)",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <ClerkProvider appearance={clerkAppearance}>
          <SiteHeader />
          <div className="flex-1">{children}</div>
          <SiteFooter />
        </ClerkProvider>
      </body>
    </html>
  );
}
