import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "OneStudios",
  description: "for the Next gen of achievers",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
