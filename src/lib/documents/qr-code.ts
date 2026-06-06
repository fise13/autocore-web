import QRCode from "qrcode";

export async function buildDocumentQrDataUri(value: string, size = 128): Promise<string> {
  return QRCode.toDataURL(value, {
    width: size,
    margin: 1,
    color: { dark: "#18181b", light: "#ffffff" },
    errorCorrectionLevel: "M",
  });
}
