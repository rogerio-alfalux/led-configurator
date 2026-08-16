import React, { useEffect, useState } from "react";
import { FileText, MessageSquareText, Minus, Package, Plus, Tag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { CartItemData } from "@/lib/cartTypes";
import { getPersistedItemPhotoUrl } from "@/lib/itemPhoto";

export function LdGuestCartItemCard({
  item,
  index,
  onRemove,
  onUpdate,
  disabled = false,
}: {
  item: CartItemData;
  index: number;
  onRemove: () => void;
  onUpdate: (patch: Partial<Pick<CartItemData, "itemEmPlanta" | "qty" | "ldItemObservation">>) => void;
  disabled?: boolean;
}) {
  const [qty, setQty] = useState(item.qty ?? 1);
  const [itemEmPlanta, setItemEmPlanta] = useState(item.itemEmPlanta ?? "");
  const [ldItemObservation, setLdItemObservation] = useState(item.ldItemObservation ?? "");
  useEffect(() => setQty(item.qty ?? 1), [item.qty]);
  useEffect(() => setItemEmPlanta(item.itemEmPlanta ?? ""), [item.itemEmPlanta]);
  useEffect(() => setLdItemObservation(item.ldItemObservation ?? ""), [item.ldItemObservation]);
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
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground flex items-center gap-1"><Tag className="w-3 h-3" /> Item em planta</span>
          <input aria-label="Item em planta" value={itemEmPlanta} onChange={(event) => { const value = event.target.value; setItemEmPlanta(value); onUpdate({ itemEmPlanta: value }); }} placeholder="Ex.: L1, P2" disabled={disabled} className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
        </label>
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">Quantidade</span>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="icon" className="h-8 w-8" disabled={disabled || qty <= 1} onClick={() => { const next = Math.max(1, qty - 1); setQty(next); onUpdate({ qty: next }); }}><Minus className="w-3 h-3" /></Button>
            <input aria-label="Quantidade" type="number" min={1} value={qty} disabled={disabled} onChange={(event) => { const next = Math.max(1, Number.parseInt(event.target.value, 10) || 1); setQty(next); onUpdate({ qty: next }); }} className="h-8 w-16 rounded-md border border-border bg-background px-2 text-center text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
            <Button type="button" variant="outline" size="icon" className="h-8 w-8" disabled={disabled} onClick={() => { const next = qty + 1; setQty(next); onUpdate({ qty: next }); }}><Plus className="w-3 h-3" /></Button>
          </div>
        </div>
      </div>
      <label className="mt-3 block space-y-1">
        <span className="text-xs text-muted-foreground flex items-center gap-1"><MessageSquareText className="w-3 h-3" /> Observação deste item <span className="font-normal">(opcional)</span></span>
        <textarea aria-label="Observação deste item" value={ldItemObservation} onChange={(event) => { const value = event.target.value; setLdItemObservation(value); onUpdate({ ldItemObservation: value }); }} placeholder="Ex.: posição na planta, acabamento, montagem ou detalhe importante" disabled={disabled} maxLength={1200} rows={2} className="w-full resize-y rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
      </label>
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
  onDelete,
  isDownloading = false,
  isDeleting = false,
}: {
  finalClientName: string;
  officeName: string;
  constructorName?: string | null;
  submittedAtLabel: string;
  statusLabel: string;
  statusClassName: string;
  pdfAvailable: boolean;
  onDownload: () => void;
  onDelete: () => void;
  isDownloading?: boolean;
  isDeleting?: boolean;
}) {
  return <Card><CardContent className="p-4 flex flex-col sm:flex-row justify-between gap-3">
    <div>
      <p className="font-semibold">{finalClientName}</p>
      <p className="text-sm text-muted-foreground">{officeName}{constructorName ? ` · ${constructorName}` : ""}</p>
      <p className="text-xs text-muted-foreground mt-1">Enviada em {submittedAtLabel}</p>
    </div>
    <div className="flex items-center gap-2 flex-wrap justify-end">
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClassName}`}>{statusLabel}</span>
      {pdfAvailable && <Button size="sm" disabled={isDownloading || isDeleting} onClick={onDownload}><FileText className="w-4 h-4 mr-1" /> Baixar PDF</Button>}
      <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" disabled={isDownloading || isDeleting} onClick={onDelete}><Trash2 className="w-4 h-4 mr-1" /> {isDeleting ? "Excluindo..." : "Excluir"}</Button>
    </div>
  </CardContent></Card>;
}
