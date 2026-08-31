import React, { useState } from "react";
import { Archive, Download, FileText, LoaderCircle, Ruler, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createProductDocumentDownloadUrl } from "@/lib/productDocumentDownload";
import { downloadProfileTechnicalDocumentsZip, getProfileTechnicalDocumentsZipEntries } from "@/lib/profileTechnicalDocumentsZip";
import {
  hasProfileTechnicalDocuments,
  type ProfileTechnicalDocuments,
} from "@/lib/profileCompositionDocuments";
import type { ProductDocument } from "@/lib/productDocuments";

function DocumentLink({
  document,
  label,
  badge,
  sku,
  Icon,
  accent,
}: {
  document: ProductDocument;
  label: string;
  badge: string;
  sku?: string;
  Icon: typeof FileText;
  accent: string;
}) {
  return (
    <a
      href={createProductDocumentDownloadUrl(document)}
      download={document.nome}
      title={`Baixar ${label}: ${document.nome}`}
      className="group flex min-w-0 items-center gap-2 rounded-md border border-border bg-card px-2.5 py-2 text-left transition-colors hover:border-primary/40 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${accent}`}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-foreground">
          {label}
          <span className="rounded bg-muted px-1 py-0.5 font-mono text-[9px] text-muted-foreground">{badge}</span>
          {sku ? <span className="font-mono text-[10px] font-medium text-primary">{sku}</span> : null}
        </span>
        <span className="block truncate text-[10px] text-muted-foreground">{document.nome}</span>
      </span>
      <Download className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" aria-hidden="true" />
    </a>
  );
}

/** Apresenta DS/IES únicos e desenhos técnicos específicos de cada SKU calculado. */
export function ProfileTechnicalDocuments({ documents }: { documents: ProfileTechnicalDocuments }) {
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  if (!hasProfileTechnicalDocuments(documents)) return null;
  const documentCount = getProfileTechnicalDocumentsZipEntries(documents).length;

  const handleDownloadAll = async () => {
    setIsDownloadingAll(true);
    setDownloadError(null);
    try {
      await downloadProfileTechnicalDocumentsZip(documents);
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : "Não foi possível preparar o pacote de documentos.");
    } finally {
      setIsDownloadingAll(false);
    }
  };

  return (
    <section className="rounded-lg border border-border bg-background/70 p-3" aria-label="Documentos técnicos da composição" data-testid="profile-technical-documents">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground">Documentos técnicos</p>
          <p className="text-[11px] text-muted-foreground">Datasheet e IES da composição; desenho técnico para cada SKU calculado.</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="-mr-1 -mt-1 h-8 w-8 shrink-0"
          onClick={handleDownloadAll}
          disabled={isDownloadingAll || documentCount === 0}
          title={`Baixar ${documentCount} arquivo${documentCount === 1 ? "" : "s"} em ZIP`}
          aria-label={`Baixar todos os ${documentCount} documentos técnicos em ZIP`}
          data-testid="download-profile-documents-zip"
        >
          {isDownloadingAll ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Archive className="h-4 w-4" aria-hidden="true" />}
        </Button>
      </div>
      {downloadError ? <p role="alert" className="mb-3 rounded-md border border-destructive/30 bg-destructive/5 px-2.5 py-2 text-[11px] text-destructive">{downloadError}</p> : null}

      {(documents.datasheet || documents.fotometria) ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {documents.datasheet ? <DocumentLink document={documents.datasheet} label="Datasheet da composição" badge="DS" Icon={FileText} accent="text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-300 dark:bg-blue-950/30 dark:border-blue-800" /> : null}
          {documents.fotometria ? <DocumentLink document={documents.fotometria} label="Fotometria Base" badge="IES" Icon={ScanLine} accent="text-violet-700 bg-violet-50 border-violet-200 dark:text-violet-300 dark:bg-violet-950/30 dark:border-violet-800" /> : null}
        </div>
      ) : null}

      {documents.desenhosTecnicos.length > 0 ? (
        <div className={documents.datasheet || documents.fotometria ? "mt-3" : ""}>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Desenhos técnicos por SKU</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {documents.desenhosTecnicos.map(({ sku, document }) => (
              <DocumentLink key={sku} document={document} label="Desenho técnico" badge="DT" sku={sku} Icon={Ruler} accent="text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/30 dark:border-amber-800" />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
