import React from "react";
import { FileText, Package, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { CartItemData } from "@/lib/cartTypes";
import { getPersistedItemPhotoUrl } from "@/lib/itemPhoto";

export function LdGuestCartItemCard({
  item,
  index,
  onRemove,
  disabled = false,
}: {
  item: CartItemData;
  index: number;
  onRemove: () => void;
  disabled?: boolean;
}) {
  const configuration = [item.power, item.cct, item.corPeca, item.itemEmPlanta ? `Item em planta: ${item.itemEmPlanta}` : null].filter(Boolean);
  const moduleComposition = item.profileSegments?.length
    ? item.profileSegments.map((segment) => `${segment.qty}× ${segment.sku}`).join(" + ")
    : null;
  const photoUrl = getPersistedItemPhotoUrl(item);

  return <Card><CardContent className="p-4 flex items-start gap-4">
    <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">{index + 1}</span>
    {photoUrl ? <img src={photoUrl} alt="" className="w-16 h-16 object-contain rounded border bg-white" /> : <div className="w-16 h-16 rounded border bg-muted flex items-center justify-center"><Package className="w-5 h-5 text-muted-foreground" /></div>}
    <div className="min-w-0 flex-1">
      <p className="text-xs text-muted-foreground font-mono">{item.sku}</p>
      <p className="font-semibold leading-snug">{item.description}</p>
      {configuration.length > 0 && <p className="text-sm text-muted-foreground mt-1">{configuration.join(" · ")}</p>}
      {moduleComposition && <p className="text-xs text-muted-foreground mt-1 break-words">{moduleComposition}</p>}
      <p className="text-xs text-muted-foreground mt-2">Quantidade: {item.qty ?? 1}</p>
    </div>
    <Button variant="ghost" size="icon" title="Remover item" disabled={disabled} onClick={onRemove}><Trash2 className="w-4 h-4" /></Button>
  </CardContent></Card>;
}

export function LdGuestRequestHistoryCard({
  finalClientName,
  officeName,
  constructorName,
  submittedAtLabel,
  statusLabel,
  statusClassName,
  pdfAvailable,
  onDownload,
  isDownloading = false,
}: {
  finalClientName: string;
  officeName: string;
  constructorName?: string | null;
  submittedAtLabel: string;
  statusLabel: string;
  statusClassName: string;
  pdfAvailable: boolean;
  onDownload: () => void;
  isDownloading?: boolean;
}) {
  return <Card><CardContent className="p-4 flex flex-col sm:flex-row justify-between gap-3">
    <div>
      <p className="font-semibold">{finalClientName}</p>
      <p className="text-sm text-muted-foreground">{officeName}{constructorName ? ` · ${constructorName}` : ""}</p>
      <p className="text-xs text-muted-foreground mt-1">Enviada em {submittedAtLabel}</p>
    </div>
    <div className="flex items-center gap-3">
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClassName}`}>{statusLabel}</span>
      {pdfAvailable && <Button size="sm" disabled={isDownloading} onClick={onDownload}><FileText className="w-4 h-4 mr-1" /> Baixar PDF</Button>}
    </div>
  </CardContent></Card>;
}
