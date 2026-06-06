import "./globals.css";

export const metadata = {
  title: "고요한 밤 — 수면 도우미",
  description: "불면증을 겪는 사람들을 위한 수면 도우미.",
  manifest: "/manifest.json",
  themeColor: "#0B1120",
  viewport: "width=device-width, initial-scale=1, viewport-fit=cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@200;300;400&family=Noto+Serif+KR:wght@200;300;400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
