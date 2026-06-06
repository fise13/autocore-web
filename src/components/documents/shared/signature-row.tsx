import { docBody, docSectionTitle } from "./document-tokens";

type SignatureRowProps = {
  clientLabel?: string;
  executorLabel?: string;
  className?: string;
};

export function SignatureRow({
  clientLabel = "Подпись клиента",
  executorLabel = "Подпись исполнителя",
  className = "",
}: SignatureRowProps) {
  return (
    <section className={`doc-signature-row grid grid-cols-2 gap-10 ${className}`}>
      <div>
        <p className={docSectionTitle}>{clientLabel}</p>
        <div className="doc-signature-line" />
        <p className={`${docBody} mt-2 text-neutral-500`}>ФИО / дата</p>
      </div>
      <div>
        <p className={docSectionTitle}>{executorLabel}</p>
        <div className="doc-signature-line" />
        <p className={`${docBody} mt-2 text-neutral-500`}>ФИО / дата</p>
      </div>
    </section>
  );
}
