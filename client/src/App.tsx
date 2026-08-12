import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { AuthGuard } from "./components/AuthGuard";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Cart from "./pages/Cart";
import Quotes from "./pages/Quotes";
import QuoteDetail from "./pages/QuoteDetail";
import FactoryOrderDetail from "./pages/FactoryOrderDetail";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import ApiKeys from "./pages/ApiKeys";
import Backup from "./pages/Backup";
import GuestLogin from "./pages/GuestLogin";
import UserManagement from "./pages/UserManagement";
import { LDGuestRequests, LDRequestsAdmin } from "./pages/LDRequests";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/carrinho"} component={Cart} />
      <Route path={"/orcamentos"} component={Quotes} />
      <Route path={"/orcamentos/:id"} component={QuoteDetail} />
      <Route path={"/orcamentos/:quoteId/pedido-fabrica"} component={FactoryOrderDetail} />
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/admin"} component={Admin} />
      <Route path={"/api-keys"} component={ApiKeys} />
      <Route path={"/backup"} component={Backup} />
      <Route path={"/usuarios"} component={UserManagement} />
      <Route path={"/solicitacoes-ld"} component={LDRequestsAdmin} />
      <Route path={"/minhas-solicitacoes-ld"} component={LDGuestRequests} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        switchable
      >
        <TooltipProvider>
          <Toaster />
          <Switch>
            <Route path="/login-convidado" component={GuestLogin} />
            <Route>
              <AuthGuard>
                <Router />
              </AuthGuard>
            </Route>
          </Switch>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
