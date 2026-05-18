"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { useNavigationStore } from "@/store/navigation";
import { apiPost } from "@/lib/api-client";

export function ForgotPasswordPage() {
  const { navigate } = useNavigationStore();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Email is required");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    try {
      await apiPost("/api/auth/forgot-password", { email });
      setIsSuccess(true);
    } catch (err) {
      // For security, still show success to prevent email enumeration
      setIsSuccess(true);
    } finally {
      setIsLoading(false);
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
            <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              {isSuccess ? (
                <CheckCircle2 className="size-7 text-success" />
              ) : (
                <Mail className="size-7 text-primary" />
              )}
            </div>
            <CardTitle className="text-2xl font-bold">
              {isSuccess ? "Check your email" : "Forgot your password?"}
            </CardTitle>
            <CardDescription className="text-base">
              {isSuccess
                ? `If an account exists for ${email}, you'll receive a password reset link shortly.`
                : "Enter your email address and we'll send you a link to reset your password."}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-4">
            {isSuccess ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="rounded-lg bg-success/10 p-4 text-center">
                  <CheckCircle2 className="size-8 text-success mx-auto mb-2" />
                  <p className="text-sm text-success font-medium">Reset link sent!</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Check your inbox and spam folder. The link expires in 1 hour.
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="w-full h-11"
                  onClick={() => navigate("login")}
                >
                  <ArrowLeft className="mr-2 size-4" />
                  Back to login
                </Button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg border border-destructive/20"
                  >
                    {error}
                  </motion.div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="h-11"
                  />
                </div>

                <Button type="submit" className="w-full h-11 text-base" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Sending reset link...
                    </>
                  ) : (
                    "Send reset link"
                  )}
                </Button>
              </form>
            )}
          </CardContent>

          {!isSuccess && (
            <CardFooter className="justify-center pb-6">
              <button
                onClick={() => navigate("login")}
                className="text-sm text-primary font-medium hover:underline flex items-center gap-1"
              >
                <ArrowLeft className="size-3" />
                Back to login
              </button>
            </CardFooter>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
