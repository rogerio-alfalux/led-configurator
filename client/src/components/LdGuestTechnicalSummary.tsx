import React from "react";
import { redactGuestQuoteSummary } from "@/lib/guestQuoteSummary";

type LdGuestTechnicalSummaryProps = {
  summary: string;
};

/** Resumo reutilizável para LD: mantém especificação técnica e não expõe valores comerciais. */
export function LdGuestTechnicalSummary({ summary }: LdGuestTechnicalSummaryProps) {
  const safeSummary = redactGuestQuoteSummary(summary);
  return (
    <div className="space-y-2" data-testid="ld-technical-summary">
      <div className="font-mono text-sm bg-muted/50 rounded-lg p-4 select-all whitespace-pre-wrap">
        {safeSummary}
      </div>
      <a href="/carrinho" className="inline-flex text-xs font-medium text-primary underline-offset-2 hover:underline">
        Ver configurações no carrinho
      </a>
    </div>
  );
}
