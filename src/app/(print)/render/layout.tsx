import "@/styles/document-pdf-template.css";
import "@/styles/document-pdf-racing.css";
import "@/styles/document-service-report.css";
import "@/styles/documents-overrides.css";

export default function DocumentRenderLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-white">{children}</div>;
}
