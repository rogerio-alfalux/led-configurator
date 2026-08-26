import React from "react";
import { Download, FileText, Ruler, ScanLine } from "lucide-react";
import type { ComponentType } from "react";
import type { ProductDocument, ProductDocuments, ProductDocumentType } from "@/lib/productDocuments";
import { hasProductDocuments } from "@/lib/productDocuments";
import { createProductDocumentDownloadUrl } from "@/lib/productDocumentDownload";

const DOCUMENT_CONFIG: Record<ProductDocumentType, {
  label: string;
  abbreviation: string;
  icon: ComponentType<{ className?: string }>;
  accent: string;
}> = {
  datasheet: {
    label: "Datasheet",
    abbreviation: "DS",
    icon: FileText,
    accent: "text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-300 dark:bg-blue-950/30 dark:border-blue-800",
  },
  fotometria: {
    label: "Fotometria",
    abbreviation: "IES",
    icon: ScanLine,
    accent: "text-violet-700 bg-violet-50 border-violet-200 dark:text-violet-300 dark:bg-violet-950/30 dark:border-violet-800",
  },
  desenhoTecnico: {
    label: "Desenho técnico",
    abbreviation: "DT",
    icon: Ruler,
    accent: "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/30 dark:border-amber-800",
  },
};

const DOCUMENT_ORDER: ProductDocumentType[] = ["datasheet", "fotometria", "desenhoTecnico"];

export function ProductDocumentDownloads({ documents }: { documents?: ProductDocuments | null }) {
  if (!hasProductDocuments(documents)) return null;

  return (
    <section className="rounded-lg border border-border bg-background/70 p-3" aria-label="Documentos do produto" data-testid="product-document-downloads">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground">Documentos do produto</p>
          <p className="text-[11px] text-muted-foreground">Arquivos fornecidos diretamente pela Alfalux</p>
        </div>
        <Download className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {DOCUMENT_ORDER.map((type) => {
          const document = documents?.[type] as ProductDocument | null | undefined;
          if (!document) return null;
          const config = DOCUMENT_CONFIG[type];
          const Icon = config.icon;
          return (
            <a
              key={type}
              href={createProductDocumentDownloadUrl(document)}
              download={document.nome}
              title={`Baixar ${config.label}: ${document.nome}`}
              className="group flex min-w-0 items-center gap-2 rounded-md border border-border bg-card px-2.5 py-2 text-left transition-colors hover:border-primary/40 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${config.accent}`}>
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  {config.label}
                  <span className="rounded bg-muted px-1 py-0.5 font-mono text-[9px] text-muted-foreground">{config.abbreviation}</span>
                </span>
                <span className="block truncate text-[10px] text-muted-foreground">{document.nome}</span>
              </span>
              <Download className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" aria-hidden="true" />
            </a>
          );
        })}
      </div>
    </section>
  );
}
