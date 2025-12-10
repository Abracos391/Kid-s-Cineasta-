import React, { Component, ErrorInfo, ReactNode } from "react";
import Button from "./ui/Button";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-cartoon-cream font-comic">
          <div className="text-6xl mb-4">🤕</div>
          <h1 className="text-4xl font-bold mb-4 text-cartoon-orange">Ops! Deu tilt no sistema.</h1>
          <p className="text-xl mb-8 bg-white p-4 rounded-xl border-2 border-black max-w-lg">
             {this.state.error?.message || "Erro desconhecido"}
          </p>
          <div className="flex gap-4">
              <Button onClick={() => window.location.reload()} variant="primary">
                🔄 Tentar Novamente
              </Button>
              <Button onClick={() => { localStorage.clear(); sessionStorage.clear(); window.location.reload(); }} variant="danger">
                🗑️ Limpar Tudo (Reset)
              </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;