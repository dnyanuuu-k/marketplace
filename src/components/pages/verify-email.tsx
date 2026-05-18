"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MailCheck, MailX, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useNavigationStore } from "@/store/navigation";
import { apiFetch } from "@/lib/api-client";

type VerifyStatus = "loading" | "success" | "error";

export function VerifyEmailPage() {
  const { navigate } = useNavigationStore();
  const [status, setStatus] = useState<VerifyStatus>("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const getToken = () => {
    const { pageParams } = useNavigationStore.getState();
    return (pageParams.token as string) || "";
  };

  const verifyEmail = React.useCallback(async (token: string) => {
    setStatus("loading");
    try {
      await apiFetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Invalid or expired verification link");
    }
  }, []);

  const hasVerified = React.useRef(false);

  useEffect(() => {
    if (hasVerified.current) return;
    hasVerified.current = true;

    const token = getToken();
    if (token) {
      // Schedule verification as a microtask to avoid synchronous setState in effect
      Promise.resolve().then(() => verifyEmail(token));
    } else {
      Promise.resolve().then(() => {
        setStatus("error");
        setErrorMessage("No verification token found. Please check your email for the correct link.");
      });
    }
  }, [verifyEmail]);

  const handleRetry = () => {
    setStatus("loading");
    const token = getToken();
    if (token) {
      verifyEmail(token);
    } else {
      setStatus("error");
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <Card className="border-border/50">
          <CardHeader className="text-center pb-2">
            <div className="size-14 rounded-2xl flex items-center justify-center mx-auto mb-4">
              {status === "loading" && (
                <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Loader2 className="size-7 text-primary animate-spin" />
                </div>
              )}
              {status === "success" && (
                <div className="size-14 rounded-2xl bg-success/10 flex items-center justify-center">
                  <MailCheck className="size-7 text-success" />
                </div>
              )}
              {status === "error" && (
                <div className="size-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
                  <MailX className="size-7 text-destructive" />
                </div>
              )}
            </div>
            <CardTitle className="text-2xl font-bold">
              {status === "loading" && "Verifying your email..."}
              {status === "success" && "Email verified!"}
              {status === "error" && "Verification failed"}
            </CardTitle>
            <CardDescription className="text-base">
              {status === "loading" && "Please wait while we verify your email address."}
              {status === "success" && "Your email has been successfully verified. You can now sign in to your account."}
              {status === "error" && errorMessage}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-4">
            {status === "success" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="rounded-lg bg-success/10 p-4 text-center">
                  <MailCheck className="size-8 text-success mx-auto mb-2" />
                  <p className="text-sm text-success font-medium">Verification complete</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your account is now active and ready to use.
                  </p>
                </div>
                <Button
                  className="w-full h-11"
                  onClick={() => navigate("login")}
                >
                  Sign in to your account
                </Button>
              </motion.div>
            )}

            {status === "error" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <Button
                  variant="outline"
                  className="w-full h-11"
                  onClick={handleRetry}
                >
                  <RefreshCw className="mr-2 size-4" />
                  Try again
                </Button>
                <Button
                  className="w-full h-11"
                  onClick={() => navigate("login")}
                >
                  Go to login
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  If the problem persists, please contact support or request a new verification email.
                </p>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
