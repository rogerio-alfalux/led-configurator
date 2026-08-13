import React from "react";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function normalizeLdProfileQuantity(value: string): number {
  return Math.max(1, Number.parseInt(value, 10) || 1);
}

export function LdProfileCartControls({
  itemEmPlanta,
  quantity,
  onItemEmPlantaChange,
  onQuantityChange,
  onSendToCart,
}: {
  itemEmPlanta: string;
  quantity: number;
  onItemEmPlantaChange: (value: string) => void;
  onQuantityChange: (quantity: number) => void;
  onSendToCart: () => void;
}) {
  return <div className="flex flex-wrap items-center justify-end gap-2">
    <Input aria-label="Item em planta do perfil" className="h-8 w-32 text-xs" value={itemEmPlanta} onChange={(event) => onItemEmPlantaChange(event.target.value)} placeholder="Item em planta" />
    <Input aria-label="Quantidade do perfil" type="number" min={1} className="h-8 w-16 text-xs" value={quantity} onChange={(event) => onQuantityChange(normalizeLdProfileQuantity(event.target.value))} />
    <Button size="sm" className="ld-result-cart-action shrink-0 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={onSendToCart}><ShoppingCart className="w-3.5 h-3.5" /> Enviar ao carrinho</Button>
  </div>;
}
