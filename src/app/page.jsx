"use client";
import dynamic from "next/dynamic";

const SleepHelper = dynamic(() => import("@/components/SleepHelper"), {
  ssr: false,
  loading: () => (
    <div style={{
      minHeight: "100vh",
      background: "#0B1120",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "rgba(160,190,220,0.4)",
      fontFamily: "sans-serif",
      fontSize: 14,
      letterSpacing: 2,
    }}>
      로딩 중...
    </div>
  ),
});

export default function Home() {
  return <SleepHelper />;
}
