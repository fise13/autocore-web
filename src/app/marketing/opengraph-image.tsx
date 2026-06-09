import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "AutoCore — программа для авторазборок и автосервисов";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function MarketingOpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background: "linear-gradient(145deg, #0a0a0a 0%, #171717 45%, #262626 100%)",
          color: "#fafafa",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "#fafafa",
              color: "#0a0a0a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              fontWeight: 700,
            }}
          >
            A
          </div>
          <span style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em" }}>AutoCore</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 920 }}>
          <p
            style={{
              margin: 0,
              fontSize: 22,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "rgba(250,250,250,0.65)",
            }}
          >
            Программа для авторазборок и автосервисов
          </p>
          <h1
            style={{
              margin: 0,
              fontSize: 64,
              lineHeight: 1.05,
              fontWeight: 700,
              letterSpacing: "-0.04em",
            }}
          >
            Склад, цех и бухгалтерия — в одной системе
          </h1>
          <p style={{ margin: 0, fontSize: 28, lineHeight: 1.45, color: "rgba(250,250,250,0.78)" }}>
            Учёт запчастей, двигателей, заказ-нарядов и гарантий без Excel и ночных сверок
          </p>
        </div>

        <p style={{ margin: 0, fontSize: 22, color: "rgba(250,250,250,0.55)" }}>myautocore.com</p>
      </div>
    ),
    { ...size },
  );
}
