import React, { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/** Lista completa dos 27 estados brasileiros (incluindo DF) */
export const BRAZIL_STATES: { uf: string; name: string }[] = [
  { uf: "AC", name: "Acre" },
  { uf: "AL", name: "Alagoas" },
  { uf: "AP", name: "Amapá" },
  { uf: "AM", name: "Amazonas" },
  { uf: "BA", name: "Bahia" },
  { uf: "CE", name: "Ceará" },
  { uf: "DF", name: "Distrito Federal" },
  { uf: "ES", name: "Espírito Santo" },
  { uf: "GO", name: "Goiás" },
  { uf: "MA", name: "Maranhão" },
  { uf: "MT", name: "Mato Grosso" },
  { uf: "MS", name: "Mato Grosso do Sul" },
  { uf: "MG", name: "Minas Gerais" },
  { uf: "PA", name: "Pará" },
  { uf: "PB", name: "Paraíba" },
  { uf: "PR", name: "Paraná" },
  { uf: "PE", name: "Pernambuco" },
  { uf: "PI", name: "Piauí" },
  { uf: "RJ", name: "Rio de Janeiro" },
  { uf: "RN", name: "Rio Grande do Norte" },
  { uf: "RS", name: "Rio Grande do Sul" },
  { uf: "RO", name: "Rondônia" },
  { uf: "RR", name: "Roraima" },
  { uf: "SC", name: "Santa Catarina" },
  { uf: "SP", name: "São Paulo" },
  { uf: "SE", name: "Sergipe" },
  { uf: "TO", name: "Tocantins" },
];

/**
 * Retorna true se a cidade selecionada é São Paulo capital.
 * Aceita variações de grafia.
 */
export function isSaoPauloCapital(city: string, state: string): boolean {
  if (state !== "SP") return false;
  const normalized = city.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return normalized === "sao paulo";
}

interface StateCitySelectorProps {
  /** Sigla do estado selecionado (ex: "SP") */
  stateCode: string;
  /** Nome da cidade selecionada */
  city: string;
  /** Chamado quando o estado muda */
  onStateChange: (state: string) => void;
  /** Chamado quando a cidade muda */
  onCityChange: (city: string) => void;
  /** Label do seletor de estado (padrão: "Estado de entrega") */
  stateLabel?: string;
  /** Label do seletor de cidade (padrão: "Cidade de entrega") */
  cityLabel?: string;
  /** Se deve mostrar botão de atalho para usar o estado do DIFAL */
  difalState?: string;
  /** Chamado ao clicar no botão de atalho do DIFAL */
  onUseDifalState?: () => void;
}

export function StateCitySelector({
  stateCode,
  city,
  onStateChange,
  onCityChange,
  stateLabel = "Estado de entrega",
  cityLabel = "Cidade de entrega",
  difalState,
  onUseDifalState,
}: StateCitySelectorProps) {
  const [cities, setCities] = useState<string[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);

  useEffect(() => {
    if (!stateCode) return;
    setLoadingCities(true);
    setCities([]);
    fetch(
      `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${stateCode}/municipios?orderBy=nome`
    )
      .then((r) => r.json())
      .then((data: { nome: string }[]) => {
        setCities(data.map((d) => d.nome));
        setLoadingCities(false);
      })
      .catch(() => setLoadingCities(false));
  }, [stateCode]);

  return (
    <div className="space-y-3">
      {/* Seletor de Estado */}
      <div>
        <Label>{stateLabel}</Label>
        <Select
          value={stateCode || "SP"}
          onValueChange={(v) => {
            onStateChange(v);
            onCityChange(""); // limpar cidade ao trocar estado
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {BRAZIL_STATES.map((s) => (
              <SelectItem key={s.uf} value={s.uf}>
                {s.uf} — {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* Botão de atalho para usar estado do DIFAL */}
        {difalState && difalState !== stateCode && onUseDifalState && (
          <button
            type="button"
            className="text-xs text-primary underline mt-1"
            onClick={onUseDifalState}
          >
            Usar estado da aba Comercial ({difalState})
          </button>
        )}
      </div>

      {/* Seletor de Cidade */}
      <div>
        <Label>{cityLabel}</Label>
        <Select
          value={city || ""}
          onValueChange={onCityChange}
          disabled={loadingCities || cities.length === 0}
        >
          <SelectTrigger>
            {loadingCities ? (
              <span className="text-muted-foreground text-sm">Carregando cidades...</span>
            ) : (
              <SelectValue placeholder="Selecione a cidade" />
            )}
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {cities.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* Indicador: fora de SP capital → frete a calcular */}
        {city && !isSaoPauloCapital(city, stateCode) && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
            ⚠ Localidade fora de São Paulo/SP Capital — frete será definido como &quot;A Calcular&quot;
          </p>
        )}
        {city && isSaoPauloCapital(city, stateCode) && (
          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
            ✓ São Paulo/SP Capital — frete CIF disponível
          </p>
        )}
      </div>
    </div>
  );
}
