import React, { type ReactNode } from "react";

/** Mantém o bloco no sistema para os perfis internos e o remove do DOM do LD Convidado. */
export function LdCommercialOnly({ isGuest, children }: { isGuest: boolean; children: ReactNode }) {
  if (isGuest) return null;
  return <>{children}</>;
}
