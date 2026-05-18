"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigationStore } from "@/store/navigation";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    console.error("[ErrorBoundary] Caught error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
  };

  handleGoHome = () => {
    const { navigate } = useNavigationStore.getState();
    navigate("dashboard");
    this.handleRetry();
  };

  toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <ErrorFallback state={this.state} onRetry={this.handleRetry} onGoHome={this.handleGoHome} onToggleDetails={this.toggleDetails} />;
    }

    return this.props.children;
  }
}

function ErrorFallback({
  state,
  onRetry,
  onGoHome,
  onToggleDetails,
}: {
  state: ErrorBoundaryState;
  onRetry: () => void;
  onGoHome: () => void;
  onToggleDetails: () => void;
}) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-center min-h-[400px] p-4"
      >
        <Card className="w-full max-w-lg border-destructive/30 dark:border-destructive/20 shadow-lg">
          <CardHeader className="text-center pb-2">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, delay: 0.1 }}
              className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-destructive/10"
            >
              <AlertTriangle className="size-8 text-destructive" />
            </motion.div>
            <CardTitle className="text-xl font-bold">Something went wrong</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              An unexpected error occurred. Don&apos;t worry, your data is safe.
            </p>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Error message */}
            {state.error && (
              <div className="rounded-lg bg-destructive/5 border border-destructive/10 p-3">
                <p className="text-sm font-medium text-destructive">
                  {state.error.message || "An unknown error occurred"}
                </p>
              </div>
            )}

            {/* Collapsible error details */}
            <div>
              <button
                onClick={onToggleDetails}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {state.showDetails ? (
                  <ChevronUp className="size-3.5" />
                ) : (
                  <ChevronDown className="size-3.5" />
                )}
                {state.showDetails ? "Hide" : "Show"} error details
              </button>

              <AnimatePresence>
                {state.showDetails && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-muted p-3 text-xs text-muted-foreground custom-scroll">
                      {state.error?.stack || "No stack trace available"}
                      {state.errorInfo?.componentStack && (
                        <>
                          {"\n\n--- Component Stack ---\n"}
                          {state.errorInfo.componentStack}
                        </>
                      )}
                    </pre>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button
                onClick={onRetry}
                className="flex-1 gap-2"
                variant="default"
              >
                <RefreshCw className="size-4" />
                Try Again
              </Button>
              <Button
                onClick={onGoHome}
                variant="outline"
                className="flex-1 gap-2"
              >
                <Home className="size-4" />
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
