import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { ShieldX, LogIn, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const ALLOWED_DOMAIN = "grupoalfalux";

function isEmailAllowed(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.toLowerCase().includes(`@${ALLOWED_DOMAIN}`);
}

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const [accessDenied, setAccessDenied] = useState(false);

  // Detectar redirect do backend com ?access=denied
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("access") === "denied") {
      setAccessDenied(true);
      // Limpar o parâmetro da URL sem recarregar a página
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, "", cleanUrl);
    }
  }, []);

  // Tela de carregamento enquanto verifica autenticação
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">Verificando acesso...</p>
        </div>
      </div>
    );
  }

  // Tela de acesso negado por domínio (vinda do backend ou detectada no frontend)
  if (accessDenied || (user && !isEmailAllowed(user.email))) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">
            <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center">
              <ShieldX className="h-10 w-10 text-destructive" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Acesso Negado</h1>
            <p className="text-muted-foreground">
              Este sistema é exclusivo para colaboradores do{" "}
              <strong className="text-foreground">Grupo Alfalux</strong>.
            </p>
            <p className="text-sm text-muted-foreground">
              Somente e-mails com domínio{" "}
              <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">
                @grupoalfalux.com.br
              </code>{" "}
              têm permissão de acesso.
            </p>
          </div>
          {user && (
            <div className="bg-muted/50 rounded-lg px-4 py-3 text-sm text-muted-foreground">
              Você está conectado como{" "}
              <strong className="text-foreground">{user.email}</strong>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              variant="outline"
              onClick={() => {
                // Fazer logout e redirecionar para login
                fetch("/api/trpc/auth.logout", { method: "POST", credentials: "include" })
                  .finally(() => {
                    window.location.href = getLoginUrl();
                  });
              }}
            >
              <LogIn className="h-4 w-4 mr-2" />
              Entrar com outra conta
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Tela de login se não autenticado
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
              <LogIn className="h-10 w-10 text-primary" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Sistema Luna</h1>
            <p className="text-sm font-medium text-muted-foreground">Alfalux Iluminação</p>
            <p className="text-muted-foreground pt-1">
              Faça login com sua conta corporativa para acessar o configurador.
            </p>
          </div>
          <Button
            size="lg"
            className="w-full sm:w-auto"
            onClick={() => { window.location.href = getLoginUrl(); }}
          >
            <LogIn className="h-4 w-4 mr-2" />
            Entrar com conta Grupo Alfalux
          </Button>
          <p className="text-xs text-muted-foreground">
            Acesso restrito a colaboradores com e-mail{" "}
            <code className="bg-muted px-1 py-0.5 rounded font-mono">@grupoalfalux.com.br</code>
          </p>
        </div>
      </div>
    );
  }

  // Usuário autenticado e com domínio válido — renderizar a aplicação
  return <>{children}</>;
}
