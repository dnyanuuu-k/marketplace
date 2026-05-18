"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Wallet,
  CreditCard,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  DollarSign,
  Banknote,
  Zap,
  ShieldCheck,
  CircleDollarSign,
  Info,
  Building2,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/shared/status-badge";
import { CurrencyDisplay } from "@/components/shared/currency-display";
import { EmptyState } from "@/components/shared/empty-state";
import { apiFetch, apiPost } from "@/lib/api-client";

// Balance ring component
function BalanceRing({
  available,
  pending,
  total,
}: {
  available: number;
  pending: number;
  total: number;
}) {
  const size = 160;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const availablePercent = total > 0 ? available / total : 0;
  const pendingPercent = total > 0 ? pending / total : 0;
  const availableLength = availablePercent * circumference;
  const pendingLength = pendingPercent * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
        />
        {/* Available arc */}
        {availablePercent > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#10b981"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${availableLength} ${circumference - availableLength}`}
            className="transition-all duration-700"
          />
        )}
        {/* Pending arc */}
        {pendingPercent > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#f59e0b"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${pendingLength} ${circumference - pendingLength}`}
            strokeDashoffset={-availableLength}
            className="transition-all duration-700"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-2xl font-bold text-foreground">${available.toFixed(2)}</p>
        <p className="text-[10px] text-muted-foreground">Available</p>
      </div>
    </div>
  );
}

// Withdrawal method card
interface WithdrawalMethod {
  id: "bank_transfer" | "paypal";
  name: string;
  icon: React.ReactNode;
  description: string;
  processingTime: string;
  fee: string;
  minAmount: number;
  maxAmount: number;
}

const WITHDRAWAL_METHODS: WithdrawalMethod[] = [
  {
    id: "bank_transfer",
    name: "Bank Transfer",
    icon: <Building2 className="size-5" />,
    description: "Direct transfer to your bank account",
    processingTime: "2-5 business days",
    fee: "No fee",
    minAmount: 50,
    maxAmount: 50000,
  },
  {
    id: "paypal",
    name: "PayPal",
    icon: <Wallet className="size-5" />,
    description: "Instant transfer to PayPal wallet",
    processingTime: "1-2 business days",
    fee: "2.5% fee",
    minAmount: 25,
    maxAmount: 10000,
  },
];

// Timeline dot component
function TimelineDot({ status }: { status: string }) {
  const isCompleted = status === "COMPLETED" || status === "APPROVED";
  const isPending = status === "PENDING";

  return (
    <div className="relative flex items-center justify-center">
      <div
        className={`size-3 rounded-full ${
          isCompleted
            ? "bg-emerald-500"
            : isPending
            ? "bg-amber-500 animate-pulse"
            : "bg-red-500"
        }`}
      />
      <div
        className={`absolute size-6 rounded-full ${
          isCompleted
            ? "bg-emerald-500/20"
            : isPending
            ? "bg-amber-500/20"
            : "bg-red-500/20"
        }`}
      />
    </div>
  );
}

export function DashboardWithdrawPage() {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"bank_transfer" | "paypal">("bank_transfer");

  const { data, isLoading } = useQuery({
    queryKey: ["my-payouts"],
    queryFn: async () => {
      const json = await apiFetch("/api/payouts/me");
      return json.data as {
        data: Array<{
          id: string;
          amount: number;
          method: string;
          status: string;
          adminNote: string | null;
          processedAt: string | null;
          createdAt: string;
        }>;
        balance: {
          available: number;
          pending: number;
          minimumPayout: number;
        };
      };
    },
  });

  const payoutMutation = useMutation({
    mutationFn: async (payload: { amount: number; method: string }) => {
      return apiPost("/api/payouts/me", payload);
    },
    onSuccess: () => {
      setAmount("");
      queryClient.invalidateQueries({ queryKey: ["my-payouts"] });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid lg:grid-cols-3 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="lg:col-span-2 h-96" />
        </div>
      </div>
    );
  }

  const balance = data?.balance || { available: 0, pending: 0, minimumPayout: 50 };
  const payouts = data?.data || [];
  const selectedMethodData = WITHDRAWAL_METHODS.find((m) => m.id === method)!;
  const totalBalance = balance.available + balance.pending;

  const parsedAmount = parseFloat(amount) || 0;
  const isAmountValid =
    parsedAmount >= selectedMethodData.minAmount &&
    parsedAmount <= Math.min(balance.available, selectedMethodData.maxAmount);

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Withdraw</h1>
          <p className="text-muted-foreground mt-1">
            Withdraw your earnings to your bank or payment account
          </p>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Withdrawal Form */}
        <div className="lg:col-span-1 space-y-6">
          {/* Balance Visualization */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center space-y-4">
                  <BalanceRing
                    available={balance.available}
                    pending={balance.pending}
                    total={totalBalance}
                  />
                  <div className="flex items-center gap-6 text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="size-2.5 rounded-full bg-emerald-500" />
                      <span className="text-muted-foreground">Available (${balance.available.toFixed(2)})</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="size-2.5 rounded-full bg-amber-500" />
                      <span className="text-muted-foreground">Pending (${balance.pending.toFixed(2)})</span>
                    </div>
                  </div>
                  <Separator />
                  <div className="w-full grid grid-cols-2 gap-3 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground">Min. Withdrawal</p>
                      <p className="text-sm font-semibold text-foreground">${selectedMethodData.minAmount}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Max. Withdrawal</p>
                      <p className="text-sm font-semibold text-foreground">${selectedMethodData.maxAmount.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Withdrawal Method Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Withdrawal Method</CardTitle>
                <CardDescription>Choose how you want to receive your funds</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {WITHDRAWAL_METHODS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMethod(m.id)}
                    className={`w-full flex items-start gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                      method === m.id
                        ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-500/5 shadow-sm"
                        : "border-border hover:border-emerald-500/30"
                    }`}
                  >
                    <div
                      className={`size-10 rounded-lg flex items-center justify-center shrink-0 ${
                        method === m.id
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {m.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{m.name}</p>
                        {method === m.id && (
                          <CheckCircle2 className="size-4 text-emerald-500" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="size-3" />
                          {m.processingTime}
                        </span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <CircleDollarSign className="size-3" />
                          {m.fee}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          {/* Withdrawal Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Request Withdrawal</CardTitle>
                <CardDescription>
                  Min: ${selectedMethodData.minAmount} · Max: ${selectedMethodData.maxAmount.toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      $
                    </span>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="pl-7"
                      min={selectedMethodData.minAmount}
                      max={Math.min(balance.available, selectedMethodData.maxAmount)}
                      step="0.01"
                    />
                  </div>
                  {/* Quick fill buttons */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => setAmount(selectedMethodData.minAmount.toString())}
                    >
                      ${selectedMethodData.minAmount}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => setAmount("100")}
                    >
                      $100
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => setAmount(balance.available.toFixed(2))}
                    >
                      All
                    </Button>
                  </div>
                  {parsedAmount > 0 && parsedAmount < selectedMethodData.minAmount && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <AlertCircle className="size-3" />
                      Minimum withdrawal is ${selectedMethodData.minAmount}
                    </p>
                  )}
                  {parsedAmount > balance.available && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="size-3" />
                      Exceeds available balance
                    </p>
                  )}
                  {parsedAmount > selectedMethodData.maxAmount && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <Info className="size-3" />
                      Maximum for {selectedMethodData.name} is ${selectedMethodData.maxAmount.toLocaleString()}
                    </p>
                  )}
                </div>

                {/* Processing info */}
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Zap className="size-3.5 text-amber-500" />
                    <span>
                      Estimated processing: <strong className="text-foreground">{selectedMethodData.processingTime}</strong>
                    </span>
                  </div>
                  {selectedMethodData.fee !== "No fee" && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <CircleDollarSign className="size-3.5 text-amber-500" />
                      <span>
                        Fee: <strong className="text-foreground">{selectedMethodData.fee}</strong>
                      </span>
                    </div>
                  )}
                </div>

                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={!isAmountValid || payoutMutation.isPending}
                  onClick={() => {
                    payoutMutation.mutate({ amount: parsedAmount, method });
                  }}
                >
                  {payoutMutation.isPending ? (
                    <>
                      <Loader2 className="size-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Request Payout
                      <ArrowRight className="size-4 ml-2" />
                    </>
                  )}
                </Button>
                {payoutMutation.isError && (
                  <p className="text-xs text-destructive">
                    {(payoutMutation.error as Error).message}
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Payout History with Timeline */}
        <div className="lg:col-span-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Payout History</CardTitle>
                <CardDescription>Your recent withdrawal requests</CardDescription>
              </CardHeader>
              <CardContent>
                {payouts.length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
                    <DollarSign className="size-12 opacity-20 mb-3" />
                    <p className="text-sm font-medium">No payouts yet</p>
                    <p className="text-xs mt-1 max-w-xs text-center">
                      Your payout history will appear here once you request a withdrawal
                    </p>
                  </div>
                ) : (
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />

                    <div className="space-y-0">
                      {payouts.map((payout, i) => (
                        <motion.div
                          key={payout.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="relative pl-8 pb-6 last:pb-0"
                        >
                          {/* Timeline dot */}
                          <div className="absolute left-0 top-1">
                            <TimelineDot status={payout.status} />
                          </div>

                          {/* Content card */}
                          <div className="p-4 rounded-lg border border-border hover:border-emerald-500/20 hover:shadow-sm transition-all">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div
                                  className={`size-10 rounded-lg flex items-center justify-center shrink-0 ${
                                    payout.status === "COMPLETED" || payout.status === "APPROVED"
                                      ? "bg-emerald-100 dark:bg-emerald-500/20"
                                      : payout.status === "PENDING"
                                      ? "bg-amber-100 dark:bg-amber-500/20"
                                      : "bg-red-100 dark:bg-red-500/20"
                                  }`}
                                >
                                  {payout.status === "COMPLETED" || payout.status === "APPROVED" ? (
                                    <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
                                  ) : payout.status === "PENDING" ? (
                                    <Clock className="size-5 text-amber-600 dark:text-amber-400" />
                                  ) : (
                                    <AlertCircle className="size-5 text-red-600 dark:text-red-400" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <CurrencyDisplay value={payout.amount} variant="positive" size="md" />
                                    <StatusBadge
                                      status={payout.status}
                                      size="sm"
                                      variant={
                                        payout.status === "COMPLETED"
                                          ? "completed"
                                          : payout.status === "PENDING"
                                          ? "pending"
                                          : payout.status === "DENIED"
                                          ? "banned"
                                          : "active"
                                      }
                                    />
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <p className="text-xs text-muted-foreground">
                                      {payout.method === "bank_transfer" ? "Bank Transfer" : "PayPal"}
                                    </p>
                                    <span className="text-muted-foreground/40">·</span>
                                    <p className="text-xs text-muted-foreground">
                                      {format(new Date(payout.createdAt), "MMM d, yyyy 'at' h:mm a")}
                                    </p>
                                  </div>
                                  {payout.processedAt && (
                                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                                      Processed: {format(new Date(payout.processedAt), "MMM d, yyyy")}
                                    </p>
                                  )}
                                  {payout.adminNote && (
                                    <p className="text-xs text-muted-foreground mt-0.5 italic">
                                      &ldquo;{payout.adminNote}&rdquo;
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
