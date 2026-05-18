"use client";

import React, { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, Globe, Percent, DollarSign, Upload, Bell, Mail, FileText, Settings } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiFetch, apiPatch } from "@/lib/api-client";

type SettingsMap = Record<string, string>;

// Section component that manages its own local state
function SettingsSection({
  settings,
  saveMutation,
  onSave,
  renderContent,
}: {
  settings: SettingsMap;
  saveMutation: ReturnType<typeof useMutation>;
  onSave: (items: Array<{ key: string; value: string }>) => void;
  renderContent: (get: (key: string, fallback: string) => string, set: (key: string, value: string) => void) => React.ReactNode;
}) {
  const [local, setLocal] = useState<Record<string, string>>({});

  const get = useCallback((key: string, fallback: string) =>
    key in local ? local[key] : (settings[key] ?? fallback)
  , [local, settings]);

  const set = useCallback((key: string, value: string) => {
    setLocal((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = useCallback((items: Array<{ key: string; value: string }>) => {
    onSave(items);
  }, [onSave]);

  return <>{renderContent(get, set)}</>;
}

export function AdminSettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch settings
  const { data, isLoading } = useQuery<{
    success: boolean;
    data: SettingsMap;
  }>({
    queryKey: ["settings"],
    queryFn: async () => {
      return apiFetch("/api/settings");
    },
  });

  const settings = data?.data || {};

  // Local overrides - keyed by settings key
  const [local, setLocal] = useState<Record<string, string>>({});

  const get = (key: string, fallback: string) =>
    key in local ? local[key] : (settings[key] ?? fallback);

  const set = (key: string, value: string) => {
    setLocal((prev) => ({ ...prev, [key]: value }));
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (sectionSettings: Array<{ key: string; value: string }>) => {
      return apiPatch("/api/settings", { settings: sectionSettings });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast({ title: "Settings saved" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const saveSection = (sectionSettings: Array<{ key: string; value: string }>) => {
    saveMutation.mutate(sectionSettings);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  // Helper to convert rate from display (e.g., "10.0") to stored (e.g., "0.1")
  const rateDisplay = get("defaultCommissionRate", "0.1");
  const commissionDisplayValue = rateDisplay
    ? (parseFloat(rateDisplay) * 100).toFixed(1)
    : "10.0";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Platform Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure global platform settings and preferences
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="commission">Commission</TabsTrigger>
          <TabsTrigger value="payout">Payout</TabsTrigger>
          <TabsTrigger value="upload">File Upload</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="social">Social Login</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="legal">Legal</TabsTrigger>
        </TabsList>

        {/* General */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="size-4" /> General Settings
              </CardTitle>
              <CardDescription>Basic platform configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Platform Name</Label>
                <Input
                  value={get("platformName", "Digital Marketplace")}
                  onChange={(e) => set("platformName", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Platform Description</Label>
                <Textarea
                  value={get("platformDescription", "The premier platform connecting buyers with talented digital creators.")}
                  onChange={(e) => set("platformDescription", e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Support Email</Label>
                <Input
                  type="email"
                  value={get("supportEmail", "support@marketplace.com")}
                  onChange={(e) => set("supportEmail", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Base URL</Label>
                <Input
                  value={get("baseUrl", "https://marketplace.com")}
                  onChange={(e) => set("baseUrl", e.target.value)}
                />
              </div>
              <Button
                onClick={() =>
                  saveSection([
                    { key: "platformName", value: get("platformName", "Digital Marketplace") },
                    { key: "platformDescription", value: get("platformDescription", "") },
                    { key: "supportEmail", value: get("supportEmail", "") },
                    { key: "baseUrl", value: get("baseUrl", "") },
                  ])
                }
                disabled={saveMutation.isPending}
              >
                <Save className="size-4 mr-2" />
                {saveMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Commission */}
        <TabsContent value="commission">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Percent className="size-4" /> Commission Settings
              </CardTitle>
              <CardDescription>Commission rates and minimums</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Default Commission Rate (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={commissionDisplayValue}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val)) {
                        set("defaultCommissionRate", String(val / 100));
                      }
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Minimum Payout Amount ($)</Label>
                  <Input
                    type="number"
                    value={get("minimumPayoutAmount", "50")}
                    onChange={(e) => set("minimumPayoutAmount", e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Input
                  value={get("currency", "USD")}
                  onChange={(e) => set("currency", e.target.value)}
                />
              </div>
              <Button
                onClick={() =>
                  saveSection([
                    { key: "defaultCommissionRate", value: get("defaultCommissionRate", "0.1") },
                    { key: "minimumPayoutAmount", value: get("minimumPayoutAmount", "50") },
                    { key: "currency", value: get("currency", "USD") },
                  ])
                }
                disabled={saveMutation.isPending}
              >
                <Save className="size-4 mr-2" />
                {saveMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payout Schedule */}
        <TabsContent value="payout">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="size-4" /> Payout Schedule
              </CardTitle>
              <CardDescription>How often authors receive payouts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup
                value={get("payoutSchedule", "weekly")}
                onValueChange={(v) => set("payoutSchedule", v)}
                className="space-y-3"
              >
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="instant" id="instant" />
                  <Label htmlFor="instant" className="font-normal">
                    Instant — Payouts processed immediately upon approval
                  </Label>
                </div>
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="weekly" id="weekly" />
                  <Label htmlFor="weekly" className="font-normal">
                    Weekly — Payouts processed every Monday
                  </Label>
                </div>
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="monthly" id="monthly" />
                  <Label htmlFor="monthly" className="font-normal">
                    Monthly — Payouts processed on the 1st of each month
                  </Label>
                </div>
              </RadioGroup>
              <Button
                onClick={() =>
                  saveSection([{ key: "payoutSchedule", value: get("payoutSchedule", "weekly") }])
                }
                disabled={saveMutation.isPending}
              >
                <Save className="size-4 mr-2" />
                {saveMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* File Upload */}
        <TabsContent value="upload">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Upload className="size-4" /> File Upload Settings
              </CardTitle>
              <CardDescription>Allowed file types and size limits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Allowed File Types</Label>
                <Input
                  value={get("allowedFileTypes", ".zip,.pdf,.png,.jpg,.svg")}
                  onChange={(e) => set("allowedFileTypes", e.target.value)}
                  placeholder=".zip,.pdf,.png,.jpg"
                />
                <p className="text-xs text-muted-foreground">Comma-separated list of file extensions</p>
              </div>
              <div className="space-y-2">
                <Label>Max File Size (MB)</Label>
                <Input
                  type="number"
                  value={get("maxFileSize", "50")}
                  onChange={(e) => set("maxFileSize", e.target.value)}
                />
              </div>
              <Button
                onClick={() =>
                  saveSection([
                    { key: "allowedFileTypes", value: get("allowedFileTypes", "") },
                    { key: "maxFileSize", value: get("maxFileSize", "50") },
                  ])
                }
                disabled={saveMutation.isPending}
              >
                <Save className="size-4 mr-2" />
                {saveMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Maintenance Mode */}
        <TabsContent value="maintenance">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="size-4" /> Maintenance Mode
              </CardTitle>
              <CardDescription>Show a maintenance page to all non-admin users</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Enable Maintenance Mode</p>
                  <p className="text-xs text-muted-foreground">
                    All users will see a maintenance page
                  </p>
                </div>
                <Switch
                  checked={get("maintenanceMode", "false") === "true"}
                  onCheckedChange={(v) => set("maintenanceMode", String(v))}
                />
              </div>
              <div className="space-y-2">
                <Label>Maintenance Message</Label>
                <Textarea
                  value={get("maintenanceMessage", "We are currently performing maintenance. Please check back soon.")}
                  onChange={(e) => set("maintenanceMessage", e.target.value)}
                  rows={3}
                />
              </div>
              <Button
                onClick={() =>
                  saveSection([
                    { key: "maintenanceMode", value: get("maintenanceMode", "false") },
                    { key: "maintenanceMessage", value: get("maintenanceMessage", "") },
                  ])
                }
                disabled={saveMutation.isPending}
              >
                <Save className="size-4 mr-2" />
                {saveMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Social Login */}
        <TabsContent value="social">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="size-4" /> Social Login
              </CardTitle>
              <CardDescription>Enable or disable social login providers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Google Login</p>
                  <p className="text-xs text-muted-foreground">
                    Allow users to sign in with Google
                  </p>
                </div>
                <Switch
                  checked={get("googleLoginEnabled", "false") === "true"}
                  onCheckedChange={(v) => set("googleLoginEnabled", String(v))}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">GitHub Login</p>
                  <p className="text-xs text-muted-foreground">
                    Allow users to sign in with GitHub
                  </p>
                </div>
                <Switch
                  checked={get("githubLoginEnabled", "false") === "true"}
                  onCheckedChange={(v) => set("githubLoginEnabled", String(v))}
                />
              </div>
              <Button
                onClick={() =>
                  saveSection([
                    { key: "googleLoginEnabled", value: get("googleLoginEnabled", "false") },
                    { key: "githubLoginEnabled", value: get("githubLoginEnabled", "false") },
                  ])
                }
                disabled={saveMutation.isPending}
              >
                <Save className="size-4 mr-2" />
                {saveMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Templates */}
        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="size-4" /> Email Templates
              </CardTitle>
              <CardDescription>Configure email notification templates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold mb-3">Welcome Email</h4>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Subject</Label>
                    <Input
                      value={get("welcomeEmailSubject", "Welcome to {platformName}!")}
                      onChange={(e) => set("welcomeEmailSubject", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Body</Label>
                    <Textarea
                      value={get("welcomeEmailBody", "Hi {userName}, welcome to {platformName}. We're excited to have you!")}
                      onChange={(e) => set("welcomeEmailBody", e.target.value)}
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">
                      Variables: {"{userName}"}, {"{platformName}"}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="text-sm font-semibold mb-3">Transaction Email</h4>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Subject</Label>
                    <Input
                      value={get("transactionEmailSubject", "Transaction #{transactionId} - {status}")}
                      onChange={(e) => set("transactionEmailSubject", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Body</Label>
                    <Textarea
                      value={get("transactionEmailBody", "Your transaction #{transactionId} has been {status}. Amount: {amount}.")}
                      onChange={(e) => set("transactionEmailBody", e.target.value)}
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">
                      Variables: {"{transactionId}"}, {"{status}"}, {"{amount}"}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="text-sm font-semibold mb-3">Payout Email</h4>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Subject</Label>
                    <Input
                      value={get("payoutEmailSubject", "Payout Processed - {amount}")}
                      onChange={(e) => set("payoutEmailSubject", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Body</Label>
                    <Textarea
                      value={get("payoutEmailBody", "Your payout of {amount} has been processed via {method}.")}
                      onChange={(e) => set("payoutEmailBody", e.target.value)}
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">
                      Variables: {"{amount}"}, {"{method}"}, {"{userName}"}
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={() =>
                  saveSection([
                    { key: "welcomeEmailSubject", value: get("welcomeEmailSubject", "") },
                    { key: "welcomeEmailBody", value: get("welcomeEmailBody", "") },
                    { key: "transactionEmailSubject", value: get("transactionEmailSubject", "") },
                    { key: "transactionEmailBody", value: get("transactionEmailBody", "") },
                    { key: "payoutEmailSubject", value: get("payoutEmailSubject", "") },
                    { key: "payoutEmailBody", value: get("payoutEmailBody", "") },
                  ])
                }
                disabled={saveMutation.isPending}
              >
                <Save className="size-4 mr-2" />
                {saveMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Legal */}
        <TabsContent value="legal">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="size-4" /> Legal
              </CardTitle>
              <CardDescription>Terms of service and privacy policy</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Terms of Service</Label>
                <Textarea
                  value={get("termsOfService", "")}
                  onChange={(e) => set("termsOfService", e.target.value)}
                  rows={8}
                  placeholder="Enter your terms of service..."
                />
              </div>
              <div className="space-y-2">
                <Label>Privacy Policy</Label>
                <Textarea
                  value={get("privacyPolicy", "")}
                  onChange={(e) => set("privacyPolicy", e.target.value)}
                  rows={8}
                  placeholder="Enter your privacy policy..."
                />
              </div>
              <Button
                onClick={() =>
                  saveSection([
                    { key: "termsOfService", value: get("termsOfService", "") },
                    { key: "privacyPolicy", value: get("privacyPolicy", "") },
                  ])
                }
                disabled={saveMutation.isPending}
              >
                <Save className="size-4 mr-2" />
                {saveMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
