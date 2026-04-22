import { useState, useCallback } from "react";
import { Moon, Sun, Zap, Settings, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "@/contexts/ThemeContext";
import {
  LED_CATALOG,
  getProfileNames,
  getInstallTypesForProfile,
  getVariant,
} from "@/lib/ledCatalog";
import type { InstallType } from "@/lib/ledCatalog";
import {
  calculateComposition,
  selectDrivers,
} from "@/lib/ledEngine";
import type {
  CompositionResult,
  ConfigInput,
  Power,
  Application,
  CCT,
  Voltage,
  DriverSpec,
  DiffuserType,
} from "@/lib/ledEngine";
import { MODULE_TYPE_LABELS } from "@/lib/ledCatalog";

// ─── Constantes ────────────────────────────────────────────────────────────────

const POWER_OPTIONS: { value: Power; label: string }[] = [
  { value: 18, label: "18W" },
  { value: 26, label: "26W" },
  { value: 36, label: "36W" },
];

const CCT_OPTIONS: { value: CCT; label: string }[] = [
  { value: "3000K", label: "3000K (Branco Quente)" },
  { value: "4000K", label: "4000K (Branco Neutro)" },
];

const INSTALL_LABELS: Record<InstallType, string> = {
  PENDENTE: "Pendente",
  SOBREPOR: "Sobrepor",
  EMBUTIR: "Embutir",
  ARANDELA: "Arandela",
};

const DIFFUSER_OPTIONS: { value: DiffuserType; label: string; desc: string }[] = [
  { value: "DA", label: "DA", desc: "Difusor Alto" },
  { value: "DB", label: "DB", desc: "Difusor Baixo" },
  { value: "DC", label: "DC", desc: "Difusor Curvo" },
];

// ─── Componentes Auxiliares ────────────────────────────────────────────────────

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-1.5">
      <span className="text-sm font-medium text-foreground">{children}</span>
      {hint && <span className="text-xs text-muted-foreground">({hint})</span>}
    </div>
  );
}

function PowerBadge({ power }: { power: Power }) {
  const colors: Record<Power, string> = {
    18: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    26: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
    36: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  };
  const labels: Record<Power, string> = {
    18: "Fileira Simples · 350mA",
    26: "Fileira Simples · 500mA",
    36: "Barra Dupla · 350mA",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${colors[power]}`}>
      {power}W · {labels[power]}
    </span>
  );
}

function DriverList({ drivers }: { drivers: DriverSpec[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {drivers.map((d, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary border border-primary/20"
        >
          <Zap className="w-3 h-3" />
          {d.quantity > 1 ? `${d.quantity}× ` : ""}{d.model}
        </span>
      ))}
    </div>
  );
}

function DiffuserSelector({
  label,
  value,
  onChange,
}: {
  label: string;
  value: DiffuserType | undefined;
  onChange: (v: DiffuserType) => void;
}) {
  return (
    <div>
      <FieldLabel hint={label}>Difusor</FieldLabel>
      <div className="grid grid-cols-3 gap-2">
        {DIFFUSER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`px-2 py-2 rounded-md text-xs font-semibold border transition-all flex flex-col items-center gap-0.5 ${
              value === opt.value
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-background text-foreground border-border hover:border-primary/50 hover:bg-muted/50"
            }`}
          >
            <span className="font-bold">{opt.label}</span>
            <span className={`text-[10px] ${value === opt.value ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
              {opt.desc}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ResultBlock({ result }: { result: CompositionResult }) {
  const efficiency = result.requestedLength > 0
    ? Math.round((result.realizedLength / result.requestedLength) * 100)
    : 0;

  const isDual = result.application === "D1+D2";

  return (
    <div className="space-y-4">

      {/* Alerta Driver Remoto */}
      {result.hasAlert && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/30">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-destructive">Driver Remoto Obrigatório</p>
            <p className="text-xs text-destructive/80 mt-0.5">
              {result.profileName} com múltiplos drivers exige instalação de driver remoto (externo ao perfil).
            </p>
          </div>
        </div>
      )}

      {/* Resumo Geral */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            Resumo da Configuração
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Métricas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg bg-muted/40 p-3 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Perfil</p>
              <p className="text-sm font-bold text-foreground font-display">{result.profileName}</p>
              <p className="text-xs text-muted-foreground font-mono">{result.profileCode}</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Instalação / Aplicação</p>
              <p className="text-sm font-bold text-foreground font-display">
                {INSTALL_LABELS[result.installType]} · {result.application}
              </p>
              <p className="text-xs text-muted-foreground">
                {isDual && result.independentLighting
                  ? result.forcedIndependent ? "Independente (forçado)" : "Independente"
                  : isDual ? "Conjunto" : "—"}
              </p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3 border border-border">
              <p className="text-xs text-muted-foreground mb-1">
                {isDual ? "Potência D1 / D2" : "Potência"}
              </p>
              <p className="text-sm font-bold text-foreground font-display">
                {isDual ? `${result.powerD1}W / ${result.powerD2}W` : `${result.powerD1}W`}
              </p>
              <p className="text-xs text-muted-foreground">{result.cct} · {result.voltage}</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Comprimento</p>
              <p className={`text-sm font-bold font-display ${
                efficiency === 100 ? "text-green-600 dark:text-green-400" : "text-yellow-600 dark:text-yellow-400"
              }`}>
                {result.realizedLength}mm
              </p>
              <p className="text-xs text-muted-foreground">
                de {result.requestedLength}mm · {efficiency}%
              </p>
            </div>
          </div>

          {/* Difusor SHARP */}
          {(result.diffuserD1 || result.diffuserD2) && (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 p-3">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-2">
                Difusor SHARP
              </p>
              <div className="flex gap-4">
                {result.diffuserD1 && (
                  <span className="text-sm text-foreground">
                    <span className="font-semibold">D1:</span> {result.diffuserD1} — {DIFFUSER_OPTIONS.find(d => d.value === result.diffuserD1)?.desc}
                  </span>
                )}
                {result.diffuserD2 && (
                  <span className="text-sm text-foreground">
                    <span className="font-semibold">D2:</span> {result.diffuserD2} — {DIFFUSER_OPTIONS.find(d => d.value === result.diffuserD2)?.desc}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Drivers Combinados (quando acendimento conjunto) */}
          {result.combinedDrivers && result.combinedDrivers.length > 0 && (
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">
                Drivers — Acendimento Conjunto (D1+D2)
              </p>
              <DriverList drivers={result.combinedDrivers} />
            </div>
          )}

          {/* Drivers Independentes */}
          {isDual && result.independentLighting && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {result.driversD1.length > 0 && (
                <div className="rounded-lg bg-muted/30 border border-border p-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Drivers D1 · {result.powerD1}W
                  </p>
                  <DriverList drivers={result.driversD1} />
                </div>
              )}
              {result.driversD2.length > 0 && (
                <div className="rounded-lg bg-muted/30 border border-border p-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Drivers D2 · {result.powerD2}W
                  </p>
                  <DriverList drivers={result.driversD2} />
                </div>
              )}
            </div>
          )}

          {/* Drivers D1 simples */}
          {!isDual && result.driversD1.length > 0 && (
            <div className="rounded-lg bg-muted/30 border border-border p-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Drivers
              </p>
              <DriverList drivers={result.driversD1} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Composição de Módulos — bloco unificado */}
      {result.composition.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Composição de Módulos
              {isDual && (
                <span className="text-xs font-normal text-muted-foreground ml-1">
                  (D1 e D2 — mesmo perfil físico)
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-border overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground">SKU</th>
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Tipo</th>
                    <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Compr.</th>
                    <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Qtd</th>
                    <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Barras *</th>
                  </tr>
                </thead>
                <tbody>
                  {result.composition.map((item, idx) => (
                    <tr key={idx} className="border-t border-border hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-2 font-mono text-primary font-medium">{item.sku}</td>
                      <td className="px-3 py-2 text-foreground">
                        <span className="inline-flex items-center gap-1">
                          <span className="font-semibold">{item.moduleType}</span>
                          <span className="text-muted-foreground hidden sm:inline">
                            — {MODULE_TYPE_LABELS[item.moduleType]}
                          </span>
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-foreground">{item.length}mm</td>
                      <td className="px-3 py-2 text-right text-foreground font-semibold">{item.quantity}</td>
                      <td className="px-3 py-2 text-right text-foreground">
                        {Number.isInteger(item.barsTotal) ? item.barsTotal : item.barsTotal.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/30">
                    <td className="px-3 py-2 font-semibold text-foreground" colSpan={2}>Total</td>
                    <td className="px-3 py-2 text-right font-semibold text-foreground">{result.realizedLength}mm</td>
                    <td className="px-3 py-2 text-right font-semibold text-foreground">
                      {result.composition.reduce((s, i) => s + i.quantity, 0)}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-foreground">
                      {(() => {
                        const t = result.composition.reduce((s, i) => s + i.barsTotal, 0);
                        return Number.isInteger(t) ? t : t.toFixed(1);
                      })()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              * Barras Stripflex (562,5mm cada). Valores fracionados indicam aproveitamento parcial da barra.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Notas de Engenharia */}
      {result.engineeringNotes.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Info className="w-4 h-4" />
              Notas de Engenharia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {result.engineeringNotes.map((note, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  {note}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Página Principal ──────────────────────────────────────────────────────────

export default function Home() {
  const { theme, toggleTheme } = useTheme();

  // Step 1: Perfil
  const [profileName, setProfileName] = useState<string>("");
  // Step 2: Instalação
  const [installType, setInstallType] = useState<InstallType | "">("");
  // Step 3: Aplicação
  const [application, setApplication] = useState<Application>("D1");
  // Step 4: Potências
  const [powerD1, setPowerD1] = useState<Power>(18);
  const [powerD2, setPowerD2] = useState<Power>(18);
  // Step 5: CCT, Tensão, Comprimento
  const [cct, setCct] = useState<CCT>("4000K");
  const [totalLength, setTotalLength] = useState<string>("2000");
  const [voltage, setVoltage] = useState<Voltage>("220Vac");
  // Toggles
  const [allowLongModules, setAllowLongModules] = useState(false);
  const [independentLighting, setIndependentLighting] = useState(false);
  // SHARP difusor
  const [diffuserD1, setDiffuserD1] = useState<DiffuserType | undefined>(undefined);
  const [diffuserD2, setDiffuserD2] = useState<DiffuserType | undefined>(undefined);

  // Result state
  const [result, setResult] = useState<CompositionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Dados derivados ──────────────────────────────────────────────────────────

  const profileNames = getProfileNames();

  // Tipos de instalação disponíveis para o perfil selecionado
  const availableInstallTypes = profileName ? getInstallTypesForProfile(profileName) : [];

  // Variante selecionada
  const selectedVariant = (profileName && installType)
    ? getVariant(profileName, installType as InstallType)
    : null;

  const profileCode = selectedVariant?.code ?? "";

  // Aplicações permitidas para esta variante
  const allowD1 = selectedVariant?.allowD1 ?? true;
  const allowD2 = selectedVariant?.allowD2 ?? true;
  const allowD1D2 = selectedVariant?.allowD1D2 ?? false;
  const hasDiffuser = selectedVariant?.hasDiffuser ?? false;

  const isDual = application === "D1+D2";
  const forcedIndependent = isDual && powerD1 !== powerD2;
  const effectiveIndependent = forcedIndependent || independentLighting;

  // Reset ao trocar perfil
  const handleProfileChange = (name: string) => {
    setProfileName(name);
    setInstallType("");
    setApplication("D1");
    setResult(null);
    setError(null);
  };

  // Reset ao trocar instalação
  const handleInstallChange = (type: InstallType) => {
    setInstallType(type);
    setApplication("D1");
    setResult(null);
    setError(null);
  };

  // Reset ao trocar aplicação
  const handleApplicationChange = (app: Application) => {
    setApplication(app);
    if (app !== "D1+D2") setIndependentLighting(false);
    setResult(null);
    setError(null);
  };

  const handleCalculate = useCallback(() => {
    setError(null);

    if (!profileCode) {
      setError("Selecione o perfil e o tipo de instalação para continuar.");
      return;
    }

    const len = parseInt(totalLength);
    if (isNaN(len) || len <= 0) {
      setError("Informe um comprimento total válido.");
      return;
    }

    if (hasDiffuser) {
      if ((application === "D1" || application === "D1+D2") && !diffuserD1) {
        setError("Selecione o tipo de difusor para D1 (SHARP).");
        return;
      }
      if ((application === "D2" || application === "D1+D2") && !diffuserD2) {
        setError("Selecione o tipo de difusor para D2 (SHARP).");
        return;
      }
    }

    const input: ConfigInput = {
      profileCode,
      application,
      powerD1,
      powerD2: isDual ? powerD2 : undefined,
      cct,
      voltage,
      totalLength: len,
      allowLongModules,
      independentLighting: effectiveIndependent,
      diffuserD1: hasDiffuser ? diffuserD1 : undefined,
      diffuserD2: hasDiffuser && isDual ? diffuserD2 : undefined,
    };

    try {
      const res = calculateComposition(input);
      setResult(res);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao calcular composição.";
      setError(msg);
    }
  }, [profileCode, application, powerD1, powerD2, cct, voltage, totalLength, allowLongModules, effectiveIndependent, isDual, hasDiffuser, diffuserD1, diffuserD2]);

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-border bg-sidebar text-sidebar-foreground shadow-sm">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
              <Zap className="w-4 h-4 text-sidebar-primary-foreground" />
            </div>
            <div>
              <h1 className="text-base font-bold font-display text-sidebar-foreground leading-none">
                Configurador de Perfis
              </h1>
              <p className="text-xs text-sidebar-foreground/60 leading-none mt-0.5">
                Alfalux Iluminação
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-xs text-sidebar-foreground/50 font-mono">
              v2.2 · {Object.keys(LED_CATALOG).length} variantes
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </header>

      {/* ── Main Content ───────────────────────────────────────────────────── */}
      <main className="container py-8">
        <div className="grid grid-cols-1 xl:grid-cols-[440px_1fr] gap-8 items-start">

          {/* ── Painel de Configuração ──────────────────────────────────────── */}
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold font-display text-foreground">Configuração</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Defina os parâmetros do perfil LED para calcular a composição.
              </p>
            </div>

            <Card className="shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Parâmetros do Perfil
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">

                {/* 1. Perfil */}
                <div>
                  <FieldLabel>Perfil</FieldLabel>
                  <Select value={profileName} onValueChange={handleProfileChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione o perfil..." />
                    </SelectTrigger>
                    <SelectContent>
                      {profileNames.map((name) => (
                        <SelectItem key={name} value={name}>
                          <span className="font-medium">{name}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 2. Instalação (aparece após perfil selecionado) */}
                {profileName && availableInstallTypes.length > 0 && (
                  <div>
                    <FieldLabel>Instalação</FieldLabel>
                    <div className={`grid gap-2 ${availableInstallTypes.length <= 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4"}`}>
                      {availableInstallTypes.map((type) => (
                        <button
                          key={type}
                          onClick={() => handleInstallChange(type)}
                          className={`px-3 py-2.5 rounded-md text-sm font-medium border transition-all ${
                            installType === type
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : "bg-background text-foreground border-border hover:border-primary/50 hover:bg-muted/50"
                          }`}
                        >
                          {INSTALL_LABELS[type]}
                        </button>
                      ))}
                    </div>
                    {selectedVariant && (
                      <p className="mt-1.5 text-xs text-muted-foreground font-mono">
                        {selectedVariant.code}
                      </p>
                    )}
                  </div>
                )}

                {/* 3. Aplicação (aparece após instalação selecionada) */}
                {selectedVariant && (
                  <div>
                    <FieldLabel>Aplicação</FieldLabel>
                    <div className="grid grid-cols-3 gap-2">
                      {(["D1", "D2", "D1+D2"] as Application[]).map((app) => {
                        const disabled =
                          (app === "D1" && !allowD1) ||
                          (app === "D2" && !allowD2) ||
                          (app === "D1+D2" && !allowD1D2);
                        return (
                          <button
                            key={app}
                            onClick={() => { if (!disabled) handleApplicationChange(app); }}
                            disabled={disabled}
                            className={`px-3 py-2 rounded-md text-sm font-medium border transition-all ${
                              disabled
                                ? "opacity-30 cursor-not-allowed bg-muted text-muted-foreground border-border"
                                : application === app
                                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                : "bg-background text-foreground border-border hover:border-primary/50 hover:bg-muted/50"
                            }`}
                          >
                            {app}
                          </button>
                        );
                      })}
                    </div>
                    {!allowD1D2 && (
                      <p className="mt-1.5 text-xs text-muted-foreground flex items-center gap-1">
                        <Info className="w-3 h-3" />
                        {profileName} não suporta D1+D2 simultâneos
                      </p>
                    )}
                  </div>
                )}

                {/* 4. Potência D1 */}
                {selectedVariant && (
                  <div>
                    <FieldLabel hint={isDual ? "D1" : undefined}>Potência</FieldLabel>
                    <div className="grid grid-cols-3 gap-2">
                      {POWER_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setPowerD1(opt.value)}
                          className={`px-3 py-2.5 rounded-md text-sm font-semibold border transition-all ${
                            powerD1 === opt.value
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : "bg-background text-foreground border-border hover:border-primary/50 hover:bg-muted/50"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    <div className="mt-2"><PowerBadge power={powerD1} /></div>
                  </div>
                )}

                {/* 4b. Potência D2 (apenas D1+D2) */}
                {selectedVariant && isDual && (
                  <div>
                    <FieldLabel hint="D2">Potência</FieldLabel>
                    <div className="grid grid-cols-3 gap-2">
                      {POWER_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setPowerD2(opt.value)}
                          className={`px-3 py-2.5 rounded-md text-sm font-semibold border transition-all ${
                            powerD2 === opt.value
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : "bg-background text-foreground border-border hover:border-primary/50 hover:bg-muted/50"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    <div className="mt-2"><PowerBadge power={powerD2} /></div>
                    {forcedIndependent && (
                      <p className="mt-2 text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Potências diferentes forçam Acendimento Independente
                      </p>
                    )}
                  </div>
                )}

                {/* 5. Difusor SHARP */}
                {selectedVariant && hasDiffuser && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-4 rounded-full bg-amber-500" />
                        <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                          Tipo de Difusor — SHARP
                        </p>
                      </div>
                      {(application === "D1" || application === "D1+D2") && (
                        <DiffuserSelector
                          label={isDual ? "D1" : undefined as unknown as string}
                          value={diffuserD1}
                          onChange={setDiffuserD1}
                        />
                      )}
                      {(application === "D2" || application === "D1+D2") && (
                        <DiffuserSelector
                          label="D2"
                          value={diffuserD2}
                          onChange={setDiffuserD2}
                        />
                      )}
                    </div>
                  </>
                )}

                {selectedVariant && <Separator />}

                {/* 6. CCT e Tensão */}
                {selectedVariant && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <FieldLabel>CCT</FieldLabel>
                      <Select value={cct} onValueChange={(v) => setCct(v as CCT)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CCT_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <FieldLabel>Tensão</FieldLabel>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(["220Vac", "Bivolt"] as const).map((v) => (
                          <button
                            key={v}
                            onClick={() => setVoltage(v)}
                            className={`px-2 py-2 rounded-md text-xs font-semibold border transition-all ${
                              voltage === v
                                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                : "bg-background text-foreground border-border hover:border-primary/50 hover:bg-muted/50"
                            }`}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 7. Comprimento Total */}
                {selectedVariant && (
                  <div>
                    <FieldLabel>Comprimento Total</FieldLabel>
                    {isDual && (
                      <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                        <Info className="w-3 h-3" />
                        D1 e D2 são instalados no mesmo perfil com o mesmo comprimento
                      </p>
                    )}
                    <div className="relative">
                      <input
                        type="number"
                        value={totalLength}
                        onChange={(e) => setTotalLength(e.target.value)}
                        min={100}
                        max={20000}
                        step={1}
                        className="w-full h-10 px-3 pr-12 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                        placeholder="ex: 2000"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">
                        mm
                      </span>
                    </div>
                  </div>
                )}

                {selectedVariant && <Separator />}

                {/* 8. Toggles */}
                {selectedVariant && (
                  <div className="space-y-3">
                    {/* Acendimento Independente */}
                    <div className="flex items-center justify-between">
                      <div>
                        <Label
                          htmlFor="independent"
                          className={`text-sm font-medium ${forcedIndependent ? "text-muted-foreground" : "cursor-pointer"}`}
                        >
                          Acendimento Independente
                        </Label>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {forcedIndependent
                            ? "Forçado — D1 e D2 com potências diferentes"
                            : "D1 e D2 com drivers separados"}
                        </p>
                      </div>
                      <Switch
                        id="independent"
                        checked={effectiveIndependent}
                        disabled={forcedIndependent || !isDual}
                        onCheckedChange={setIndependentLighting}
                      />
                    </div>

                    {/* Módulos Longos */}
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="longmodules" className="text-sm font-medium cursor-pointer">
                          Permitir Módulos Longos
                        </Label>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Habilitar módulos &gt;2825mm
                        </p>
                      </div>
                      <Switch
                        id="longmodules"
                        checked={allowLongModules}
                        onCheckedChange={setAllowLongModules}
                      />
                    </div>
                  </div>
                )}

              </CardContent>
            </Card>

            {/* Botão Calcular */}
            {selectedVariant && (
              <Button
                onClick={handleCalculate}
                className="w-full h-12 text-base font-semibold font-display"
                size="lg"
              >
                <Zap className="w-5 h-5 mr-2" />
                Calcular Composição
              </Button>
            )}

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                {error}
              </div>
            )}
          </div>

          {/* ── Painel de Resultados ────────────────────────────────────────── */}
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold font-display text-foreground">Resultado</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Composição calculada com base nos parâmetros informados.
              </p>
            </div>

            {!result ? (
              <Card className="shadow-sm">
                <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                    <Zap className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-base font-semibold text-foreground font-display">
                    Nenhum cálculo realizado
                  </p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                    Configure os parâmetros no painel ao lado e clique em "Calcular Composição".
                  </p>
                </CardContent>
              </Card>
            ) : (
              <ResultBlock result={result} />
            )}
          </div>
        </div>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-border mt-16 py-6">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>© 2025 Alfalux Iluminação · Configurador de Perfis</span>
          <span className="font-mono">
            {Object.keys(LED_CATALOG).length} variantes · Regra de Ouro aplicada
          </span>
        </div>
      </footer>
    </div>
  );
}
