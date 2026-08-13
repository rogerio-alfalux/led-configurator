import React from "react";
import { ShoppingCart } from "lucide-react";

export function LdGuestCartAccess({ cartCount }: { cartCount: number }) {
  const countLabel = cartCount > 9 ? "9+" : String(Math.max(0, cartCount));
  return (
    <a
      href="/carrinho"
      title="Enviar configurações ao orçamento"
      className="inline-flex h-9 items-center gap-2 rounded-md border border-sidebar-foreground/30 bg-sidebar-accent/40 px-3 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      data-testid="ld-guest-cart-access"
    >
      <ShoppingCart className="h-4 w-4" />
      <span className="hidden sm:inline">Enviar ao carrinho</span>
      {cartCount > 0 && <span className="font-semibold">({countLabel})</span>}
    </a>
  );
}
