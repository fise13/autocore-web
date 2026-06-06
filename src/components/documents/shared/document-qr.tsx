import { DocumentContext } from "@/lib/documents/document-context";
import { getAppUrl } from "@/lib/site-urls";

type DocumentQrProps = {
  verificationToken?: string;
  dataUri?: string;
  label?: string;
};

export function buildWarrantyVerifyUrl(token: string): string {
  return `${getAppUrl()}/warranty/${token}`;
}

export function DocumentQr({ verificationToken, dataUri, label = "Проверка гарантии" }: DocumentQrProps) {
  if (!dataUri && !verificationToken) return null;

  return (
    <div className="doc-qr-block">
      {dataUri ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={dataUri} alt="" className="doc-qr-image" />
      ) : null}
      {verificationToken ? (
        <p className="doc-qr-caption">
          {label}: {buildWarrantyVerifyUrl(verificationToken)}
        </p>
      ) : null}
    </div>
  );
}

export function warrantyQrLabel(_context: DocumentContext): string {
  return "Сканируйте для проверки гарантии";
}
