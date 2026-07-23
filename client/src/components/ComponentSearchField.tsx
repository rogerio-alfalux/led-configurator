import { useState, useRef, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Search, X, Loader2 } from "lucide-react";

export interface ComponentOption {
  codigo: string;
  descricao: string;
  tipo: string;
  disponivel: boolean;
}

interface ComponentSearchFieldProps {
  /** Rótulo do campo */
  label: string;
  /** Valor atual (descrição + código, ex: "STRIPFLEX 562,5 x 10mm 36L 3000K (EQ00125)") */
  value: string;
  /** Quantidade separada */
  qty: number | string;
  /** Callback ao mudar a descrição/código */
  onValueChange: (descricao: string, codigo: string) => void;
  /** Callback ao mudar a quantidade */
  onQtyChange: (qty: number) => void;
  /** Lista de opções disponíveis para autocomplete */
  options: ComponentOption[];
  /** Placeholder do campo de busca */
  placeholder?: string;
  /** Se true, o campo é somente leitura */
  readOnly?: boolean;
  /** Se true, os dados ainda estão carregando */
  isLoading?: boolean;
  /** Classe CSS adicional */
  className?: string;
}

export function ComponentSearchField({
  label,
  value,
  qty,
  onValueChange,
  onQtyChange,
  options,
  placeholder = "Buscar componente...",
  readOnly = false,
  isLoading = false,
  className,
}: ComponentSearchFieldProps) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtrar opções pelo termo de busca
  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return options.slice(0, 50); // Mostrar primeiros 50 sem filtro
    return options.filter(o =>
      o.codigo.toLowerCase().includes(term) ||
      o.descricao.toLowerCase().includes(term)
    ).slice(0, 50);
  }, [options, search]);

  const handleSelect = (opt: ComponentOption) => {
    onValueChange(opt.descricao, opt.codigo);
    setOpen(false);
    setSearch("");
  };

  const handleClear = () => {
    onValueChange("", "");
    setSearch("");
  };

  // Extrair código EQ do valor atual (ex: "(EQ00125)" → "EQ00125")
  const currentCode = value.match(/\(([A-Z]{2}\d+)\)/)?.[1] ?? "";
  const currentDesc = value.replace(/\s*\([A-Z]{2}\d+\)\s*$/, "").trim();

  // Mostrar dropdown quando: aberto, não readonly, e (tem resultados OU está carregando)
  const showDropdown = open && !readOnly && (filtered.length > 0 || isLoading);

  return (
    <div className={cn("space-y-1", className)} ref={containerRef}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex gap-2 items-start">
        {/* Campo de quantidade */}
        <div className="w-20 shrink-0">
          <Label className="text-xs text-muted-foreground/70">Qtd.</Label>
          <Input
            type="number"
            min={0}
            step={0.1}
            value={qty}
            onChange={e => onQtyChange(parseFloat(e.target.value) || 0)}
            disabled={readOnly}
            className="h-8 text-sm text-center mt-1"
          />
        </div>

        {/* Campo de descrição com autocomplete */}
        <div className="flex-1 relative">
          <Label className="text-xs text-muted-foreground/70">Componente</Label>
          <div className="relative mt-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
            <Input
              ref={inputRef}
              value={focused ? search : value}
              onChange={e => {
                setSearch(e.target.value);
                setOpen(true);
              }}
              onFocus={() => {
                setFocused(true);
                setSearch("");
                setOpen(true);
              }}
              onBlur={() => {
                // Pequeno delay para permitir clique no dropdown
                setTimeout(() => setFocused(false), 150);
              }}
              placeholder={value || placeholder}
              disabled={readOnly}
              className={cn(
                "h-8 text-xs pl-6 pr-6 font-mono",
                !value && "text-muted-foreground"
              )}
            />
            {value && !readOnly && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Dropdown de resultados */}
          {showDropdown && (
            <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-64 overflow-y-auto">
              {isLoading && filtered.length === 0 ? (
                <div className="flex items-center gap-2 px-3 py-3 text-xs text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Carregando componentes...
                </div>
              ) : filtered.length === 0 ? (
                <div className="px-3 py-3 text-xs text-muted-foreground">
                  Nenhum componente encontrado
                </div>
              ) : (
                filtered.map(opt => (
                  <button
                    key={opt.codigo}
                    type="button"
                    onMouseDown={e => {
                      e.preventDefault();
                      handleSelect(opt);
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2 text-xs hover:bg-accent hover:text-accent-foreground transition-colors",
                      !opt.disponivel && "opacity-50"
                    )}
                  >
                    <span className="font-mono font-semibold text-primary">{opt.codigo}</span>
                    <span className="ml-2 text-muted-foreground">{opt.descricao}</span>
                    {!opt.disponivel && <span className="ml-2 text-xs text-destructive">(indisponível)</span>}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Badge do código EQ atual */}
        {currentCode && (
          <div className="shrink-0 mt-6">
            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-mono bg-primary/10 text-primary border border-primary/20">
              {currentCode}
            </span>
          </div>
        )}
      </div>

      {/* Mostrar descrição atual quando não está em foco */}
      {value && !focused && currentDesc && (
        <p className="text-xs font-mono text-muted-foreground pl-22 truncate" title={value}>
          {currentDesc}
        </p>
      )}
    </div>
  );
}
