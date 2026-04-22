import { useState, useCallback } from "react";
import { Moon, Sun, Zap, Settings, AlertTriangle, CheckCircle2, ChevronDown, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "@/contexts/ThemeContext";
import { LED_CATALOG, PROFILE_OPTIONS, ModuleType } from "@/lib/ledCatalog";
import {
  calculateComposition,
  selectDrivers,
  CompositionResult,
  ConfigInput,
  Power,
  Application,
  CCT,
  SectionResult,
  DriverSpec,
} from "@/lib/ledEngine";

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

const APPLICATION_OPTIONS: { value: Application; label: string }[] = [
  { value: "D1", label: "D1 (Simples)" },
  { value: "D2", label: "D2 (Simples)" },
  { value: "D1+D2", label: "D1 + D2 (Duplo)" },
];

const MODULE_TYPE_OPTIONS: { value: ModuleType; label: string; desc: string }[] = [
  { value: "IN", label: "IN", desc: "Instalação Normal" },
  { value: "IF", label: "IF", desc: "Instalação Final" },
  { value: "ML", label: "ML", desc: "Módulo Longo" },
];

// ─── Componentes Auxiliares ────────────────────────────────────────────────────

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-1.5">
      <span className="text-sm font-medium text-foreground">{children}</span>
      {hint && (
        <span className="text-xs text-muted-foreground">({hint})</span>
      )}
    </div>
  );
}

function PowerBadge({ power }: { power: Power }) {
  const colors: Record<Power, string> = {
    18: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    26: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
    36: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  };
  const currentLabel: Record<Power, string> = {
    18: "· Fileira Simples · 350mA",
    26: "· Fileira Simples · 500mA",
    36: "· Barra Dupla · 350mA",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${colors[power]}`}>
      {power}W {currentLabel[power]}
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

function SectionCard({ section, label, voltage }: { section: SectionResult; label: string; voltage: import('@/lib/ledEngine').Voltage }) {
  const efficiency = section.requestedLength > 0
    ? Math.round((section.realizedLength / section.requestedLength) * 100)
    : 0;

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground font-display">{label}</span>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
          efficiency === 100
            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
            : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
        }`}>
          {efficiency}% aproveitamento
        </span>
      </div>

      {/* Comprimentos */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-md bg-background p-3 border border-border">
          <p className="text-xs text-muted-foreground mb-0.5">Solicitado</p>
          <p className="text-lg font-bold text-foreground font-display">{section.requestedLength}<span className="text-xs font-normal ml-1">mm</span></p>
        </div>
        <div className="rounded-md bg-background p-3 border border-border">
          <p className="text-xs text-muted-foreground mb-0.5">Realizado</p>
          <p className={`text-lg font-bold font-display ${
            section.realizedLength === section.requestedLength
              ? "text-green-600 dark:text-green-400"
              : "text-yellow-600 dark:text-yellow-400"
          }`}>
            {section.realizedLength}<span className="text-xs font-normal ml-1">mm</span>
          </p>
        </div>
      </div>

      {/* Tabela de Itens */}
      {section.composition.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Composição de Módulos</p>
          <div className="rounded-md border border-border overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-3 py-2 font-semibold text-muted-foreground">SKU</th>
                  <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Compr.</th>
                  <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Barras</th>
                  <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Drivers</th>
                </tr>
              </thead>
              <tbody>
                {section.composition.map((item, idx) => {
                  const itemDrivers = selectDrivers(item.barsTotal, section.power, voltage);
                  const driverQty = itemDrivers.reduce((sum, d) => sum + d.quantity, 0);
                  return (
                    <tr key={idx} className="border-t border-border hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-2 font-mono text-primary font-medium">{item.sku}</td>
                      <td className="px-3 py-2 text-right text-foreground">{item.length}mm</td>
                      <td className="px-3 py-2 text-right text-foreground">{item.barsTotal}</td>
                      <td className="px-3 py-2 text-right text-foreground">{driverQty}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/30">
                  <td className="px-3 py-2 font-semibold text-foreground">Total</td>
                  <td className="px-3 py-2 text-right font-semibold text-foreground">{section.realizedLength}mm</td>
                  <td className="px-3 py-2 text-right font-semibold text-foreground">{section.totalBars}</td>
                  <td className="px-3 py-2 text-right font-semibold text-foreground">
                    {section.drivers.reduce((sum, d) => sum + d.quantity, 0)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Drivers */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Drivers</p>
        <DriverList drivers={section.drivers} />
      </div>
    </div>
  );
}

// ─── Página Principal ──────────────────────────────────────────────────────────

export default function Home() {
  const { theme, toggleTheme } = useTheme();

  // Form state
  const [profileCode, setProfileCode] = useState<string>("");
  const [application, setApplication] = useState<Application>("D1");
  const [powerD1, setPowerD1] = useState<Power>(18);
  const [powerD2, setPowerD2] = useState<Power>(18);
  const [cct, setCct] = useState<CCT>("4000K");
  const [lengthD1, setLengthD1] = useState<string>("2000");
  const [lengthD2, setLengthD2] = useState<string>("2000");
  const [moduleType, setModuleType] = useState<ModuleType>("IN");
  const [allowLongModules, setAllowLongModules] = useState(false);
  const [independentLighting, setIndependentLighting] = useState(false);
  const [voltage, setVoltage] = useState<import('@/lib/ledEngine').Voltage>("220Vac");

  // Result state
  const [result, setResult] = useState<CompositionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedProfile = profileCode ? LED_CATALOG[profileCode] : null;
  const profileNoD1D2 = selectedProfile?.noD1D2 ?? false;
  const isDual = application === "D1+D2";

  const handleCalculate = useCallback(() => {
    setError(null);

    if (!profileCode) {
      setError("Selecione um perfil para continuar.");
      return;
    }

    const len1 = parseInt(lengthD1);
    const len2 = parseInt(lengthD2);

    if (isNaN(len1) || len1 <= 0) {
      setError("Informe um comprimento válido para D1.");
      return;
    }

    if (isDual && (isNaN(len2) || len2 <= 0)) {
      setError("Informe um comprimento válido para D2.");
      return;
    }

    const input: ConfigInput = {
      profileCode,
      application,
      powerD1,
      powerD2: isDual ? powerD2 : undefined,
      cct,
      voltage,
      lengthD1: len1,
      lengthD2: isDual ? len2 : undefined,
      moduleType,
      allowLongModules,
      independentLighting,
    };

    try {
      const res = calculateComposition(input);
      setResult(res);
    } catch (e) {
      setError("Erro ao calcular composição. Verifique os parâmetros.");
    }
  }, [profileCode, application, powerD1, powerD2, cct, voltage, lengthD1, lengthD2, moduleType, allowLongModules, independentLighting, isDual]);

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
              v2.0 · {Object.keys(LED_CATALOG).length} perfis
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
        <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-8 items-start">

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

                {/* Perfil */}
                <div>
                  <FieldLabel>Perfil</FieldLabel>
                  <Select value={profileCode} onValueChange={setProfileCode}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione o perfil..." />
                    </SelectTrigger>
                    <SelectContent>
                      {PROFILE_OPTIONS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          <div className="flex flex-col">
                            <span className="font-medium">{p.name}</span>
                            <span className="text-xs text-muted-foreground font-mono">{p.value}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Aplicação */}
                <div>
                  <FieldLabel>Aplicação</FieldLabel>
                  <div className="grid grid-cols-3 gap-2">
                    {APPLICATION_OPTIONS.map((opt) => {
                      const disabled = profileNoD1D2 && opt.value === "D1+D2";
                      return (
                        <button
                          key={opt.value}
                          onClick={() => {
                            if (!disabled) {
                              setApplication(opt.value);
                              if (opt.value !== "D1+D2") setIndependentLighting(false);
                            }
                          }}
                          disabled={disabled}
                          className={`px-3 py-2 rounded-md text-sm font-medium border transition-all ${
                            disabled
                              ? "opacity-30 cursor-not-allowed bg-muted text-muted-foreground border-border"
                              : application === opt.value
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : "bg-background text-foreground border-border hover:border-primary/50 hover:bg-muted/50"
                          }`}
                        >
                          {opt.value}
                        </button>
                      );
                    })}
                  </div>
                  {profileNoD1D2 && (
                    <p className="mt-1.5 text-xs text-muted-foreground flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      BLAZE não suporta D1+D2 simultâneos
                    </p>
                  )}
                </div>

                {/* Potência D1 */}
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
                  <div className="mt-2">
                    <PowerBadge power={powerD1} />
                  </div>
                </div>

                {/* Potência D2 (apenas D1+D2) */}
                {isDual && (
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
                    <div className="mt-2">
                      <PowerBadge power={powerD2} />
                    </div>
                    {powerD1 !== powerD2 && (
                      <p className="mt-2 text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Potências diferentes forçam Acendimento Independente
                      </p>
                    )}
                  </div>
                )}

                <Separator />

                {/* CCT e Tensão */}
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

                {/* Tipo de Módulo */}
                <div>
                  <FieldLabel>Tipo de Módulo</FieldLabel>
                  <div className="grid grid-cols-3 gap-2">
                    {MODULE_TYPE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setModuleType(opt.value)}
                        className={`px-3 py-2 rounded-md text-sm font-medium border transition-all text-center ${
                          moduleType === opt.value
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-background text-foreground border-border hover:border-primary/50 hover:bg-muted/50"
                        }`}
                      >
                        <div className="font-bold">{opt.label}</div>
                        <div className="text-[10px] opacity-70">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Comprimento D1 */}
                <div>
                  <FieldLabel hint={isDual ? "D1" : undefined}>Comprimento Total</FieldLabel>
                  <div className="relative">
                    <input
                      type="number"
                      value={lengthD1}
                      onChange={(e) => setLengthD1(e.target.value)}
                      min={100}
                      max={10000}
                      step={1}
                      className="w-full h-10 px-3 pr-12 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                      placeholder="ex: 2000"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">
                      mm
                    </span>
                  </div>
                </div>

                {/* Comprimento D2 */}
                {isDual && (
                  <div>
                    <FieldLabel hint="D2">Comprimento Total</FieldLabel>
                    <div className="relative">
                      <input
                        type="number"
                        value={lengthD2}
                        onChange={(e) => setLengthD2(e.target.value)}
                        min={100}
                        max={10000}
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

                <Separator />

                {/* Toggles */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="independent" className="text-sm font-medium cursor-pointer">
                        Acendimento Independente
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        D1 e D2 com drivers separados
                      </p>
                    </div>
                    <Switch
                      id="independent"
                      checked={independentLighting || (isDual && powerD1 !== powerD2)}
                      disabled={isDual && powerD1 !== powerD2}
                      onCheckedChange={setIndependentLighting}
                    />
                  </div>

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

              </CardContent>
            </Card>

            {/* Botão Calcular */}
            <Button
              onClick={handleCalculate}
              className="w-full h-12 text-base font-semibold font-display"
              size="lg"
            >
              <Zap className="w-5 h-5 mr-2" />
              Calcular Composição
            </Button>

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
              <div className="space-y-4">

                {/* Alerta EASY H PLUS */}
                {result.hasAlert && (
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/30">
                    <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-destructive">Driver Remoto Obrigatório</p>
                      <p className="text-xs text-destructive/80 mt-0.5">
                        O perfil EASY H PLUS com múltiplos drivers exige instalação de driver remoto (externo ao perfil).
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
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                      <div className="rounded-lg bg-muted/40 p-3 border border-border">
                        <p className="text-xs text-muted-foreground mb-1">Perfil</p>
                        <p className="text-sm font-bold text-foreground font-display">{result.profileName}</p>
                        <p className="text-xs text-muted-foreground font-mono">{result.profileCode}</p>
                      </div>
                      <div className="rounded-lg bg-muted/40 p-3 border border-border">
                        <p className="text-xs text-muted-foreground mb-1">Aplicação</p>
                        <p className="text-sm font-bold text-foreground font-display">{result.application}</p>
                        <p className="text-xs text-muted-foreground">Módulo {result.moduleType}</p>
                      </div>
                      <div className="rounded-lg bg-muted/40 p-3 border border-border">
                        <p className="text-xs text-muted-foreground mb-1">Potência</p>
                        <p className="text-sm font-bold text-foreground font-display">{result.power}W</p>
                        <p className="text-xs text-muted-foreground">{result.cct} · {result.voltage}</p>
                      </div>
                      <div className="rounded-lg bg-muted/40 p-3 border border-border">
                        <p className="text-xs text-muted-foreground mb-1">Acendimento</p>
                        <p className="text-sm font-bold text-foreground font-display">
                          {result.independentLighting ? "Independente" : "Conjunto"}
                        </p>
                        {result.forcedIndependent && (
                          <p className="text-xs text-yellow-600 dark:text-yellow-400">Forçado</p>
                        )}
                      </div>
                    </div>

                    {/* Drivers Combinados (quando conjunto) */}
                    {result.combinedDrivers && (
                      <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                        <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">
                          Drivers Otimizados (Acendimento Conjunto)
                        </p>
                        <DriverList drivers={result.combinedDrivers} />
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Seções */}
                {result.sections.map((section, idx) => (
                  <SectionCard
                    key={idx}
                    section={section}
                    label={`Seção ${section.application}`}
                    voltage={result.voltage}
                  />
                ))}

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
            )}
          </div>
        </div>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-border mt-16 py-6">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>© 2025 Alfalux Iluminação · Configurador de Perfis</span>
          <span className="font-mono">
            {Object.keys(LED_CATALOG).length} perfis · Regra de Ouro aplicada
          </span>
        </div>
      </footer>
    </div>
  );
}
