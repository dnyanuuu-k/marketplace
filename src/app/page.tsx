"use client";

import React, { useEffect, lazy, Suspense } from "react";
import { useNavigationStore, isPublicPage } from "@/store/navigation";
import { useAuthStore } from "@/store/auth";

// Layouts - keep these as static imports since they're always needed
import { DashboardShell } from "@/components/layouts/dashboard-shell";
import { PublicShell } from "@/components/layouts/public-shell";

// Lazy-load ALL page components to prevent OOM during dev compilation
// Only the active page gets compiled at a time

// Public pages
const LandingPage = lazy(() => import("@/components/pages/landing").then(m => ({ default: m.LandingPage })));
const LoginPage = lazy(() => import("@/components/pages/login").then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import("@/components/pages/register").then(m => ({ default: m.RegisterPage })));
const OnboardingPage = lazy(() => import("@/components/pages/onboarding").then(m => ({ default: m.OnboardingPage })));
const BrowsePage = lazy(() => import("@/components/pages/browse").then(m => ({ default: m.BrowsePage })));
const BrowseProjectsPage = lazy(() => import("@/components/pages/browse-projects").then(m => ({ default: m.BrowseProjectsPage })));
const ProjectDetailPage = lazy(() => import("@/components/pages/project-detail").then(m => ({ default: m.ProjectDetailPage })));
const ProfilePage = lazy(() => import("@/components/pages/profile").then(m => ({ default: m.ProfilePage })));
const ForgotPasswordPage = lazy(() => import("@/components/pages/forgot-password").then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import("@/components/pages/reset-password").then(m => ({ default: m.ResetPasswordPage })));
const VerifyEmailPage = lazy(() => import("@/components/pages/verify-email").then(m => ({ default: m.VerifyEmailPage })));

// Dashboard pages
const DashboardHomePage = lazy(() => import("@/components/pages/dashboard-home").then(m => ({ default: m.DashboardHomePage })));
const DashboardPurchasesPage = lazy(() => import("@/components/pages/dashboard-purchases").then(m => ({ default: m.DashboardPurchasesPage })));
const DashboardEarningsPage = lazy(() => import("@/components/pages/dashboard-earnings").then(m => ({ default: m.DashboardEarningsPage })));
const DashboardWithdrawPage = lazy(() => import("@/components/pages/dashboard-withdraw").then(m => ({ default: m.DashboardWithdrawPage })));
const DashboardPortfolioPage = lazy(() => import("@/components/pages/dashboard-portfolio").then(m => ({ default: m.DashboardPortfolioPage })));
const DashboardReviewsPage = lazy(() => import("@/components/pages/dashboard-reviews").then(m => ({ default: m.DashboardReviewsPage })));
const DashboardMessagesPage = lazy(() => import("@/components/pages/dashboard-messages").then(m => ({ default: m.DashboardMessagesPage })));
const DashboardSettingsPage = lazy(() => import("@/components/pages/dashboard-settings").then(m => ({ default: m.DashboardSettingsPage })));
const DashboardAnalyticsPage = lazy(() => import("@/components/pages/dashboard-analytics").then(m => ({ default: m.DashboardAnalyticsPage })));
const DashboardWishlistPage = lazy(() => import("@/components/pages/dashboard-wishlist").then(m => ({ default: m.DashboardWishlistPage })));
const DashboardTrackingPage = lazy(() => import("@/components/pages/dashboard-tracking").then(m => ({ default: m.DashboardTrackingPage })));
const DashboardMyProjectsPage = lazy(() => import("@/components/pages/dashboard-my-projects").then(m => ({ default: m.DashboardMyProjectsPage })));

// Admin pages
const AdminOverviewPage = lazy(() => import("@/components/pages/admin-overview").then(m => ({ default: m.AdminOverviewPage })));
const AdminUsersPage = lazy(() => import("@/components/pages/admin-users").then(m => ({ default: m.AdminUsersPage })));
const AdminTransactionsPage = lazy(() => import("@/components/pages/admin-transactions").then(m => ({ default: m.AdminTransactionsPage })));
const AdminPayoutsPage = lazy(() => import("@/components/pages/admin-payouts").then(m => ({ default: m.AdminPayoutsPage })));
const AdminCommissionsPage = lazy(() => import("@/components/pages/admin-commissions").then(m => ({ default: m.AdminCommissionsPage })));
const AdminDisputesPage = lazy(() => import("@/components/pages/admin-disputes").then(m => ({ default: m.AdminDisputesPage })));
const AdminReviewsPage = lazy(() => import("@/components/pages/admin-reviews").then(m => ({ default: m.AdminReviewsPage })));
const AdminNotificationsPage = lazy(() => import("@/components/pages/admin-notifications").then(m => ({ default: m.AdminNotificationsPage })));
const AdminSettingsPage = lazy(() => import("@/components/pages/admin-settings").then(m => ({ default: m.AdminSettingsPage })));
const AdminAuditLogPage = lazy(() => import("@/components/pages/admin-audit-log").then(m => ({ default: m.AdminAuditLogPage })));

// Mod pages
const ModApplicationsPage = lazy(() => import("@/components/pages/mod-applications").then(m => ({ default: m.ModApplicationsPage })));
const ModReviewsPage = lazy(() => import("@/components/pages/mod-reviews").then(m => ({ default: m.ModReviewsPage })));
const ModUsersPage = lazy(() => import("@/components/pages/mod-users").then(m => ({ default: m.ModUsersPage })));

// Feature pages
const NotificationsPage = lazy(() => import("@/components/pages/notifications").then(m => ({ default: m.NotificationsPage })));
const ActivityPage = lazy(() => import("@/components/pages/activity").then(m => ({ default: m.ActivityPage })));
const SavedAuthorsPage = lazy(() => import("@/components/pages/saved-authors").then(m => ({ default: m.SavedAuthorsPage })));
const HelpPage = lazy(() => import("@/components/pages/help").then(m => ({ default: m.HelpPage })));
const SupportPage = lazy(() => import("@/components/pages/support").then(m => ({ default: m.SupportPage })));
const DisputesPage = lazy(() => import("@/components/pages/disputes").then(m => ({ default: m.DisputesPage })));
const TransactionDetailPage = lazy(() => import("@/components/pages/transaction-detail").then(m => ({ default: m.TransactionDetailPage })));

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { SocketProvider } from "@/components/socket-provider";
import { ErrorBoundary } from "@/components/shared/error-boundary";

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="space-y-4 w-full max-w-sm px-4">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="size-10 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold">M</span>
          </div>
          <span className="font-semibold text-lg">Marketplace</span>
        </div>
        <Card>
          <CardContent className="pt-6 space-y-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Page-level loading fallback
function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-3">
        <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

function isDashboardPage(page: string): boolean {
  return (
    page.startsWith("dashboard") ||
    page.startsWith("admin") ||
    page.startsWith("mod") ||
    page === "notifications" ||
    page === "help" ||
    page === "support" ||
    page === "activity" ||
    page === "saved-authors" ||
    page === "disputes" ||
    page === "transaction-detail" ||
    page === "browse-projects" ||
    page === "project-detail"
  );
}

function isAdminPage(page: string, role: string | undefined): boolean {
  if (page.startsWith("admin") && role !== "SUPER_ADMIN") return false;
  if (page.startsWith("mod") && role !== "MODERATOR" && role !== "SUPER_ADMIN") return false;
  return true;
}

// Page renderer component - declared outside of render cycle
function PageRenderer({ page }: { page: string }) {
  return (
    <ErrorBoundary>
    <Suspense fallback={<PageLoader />}>
      {(() => {
        switch (page) {
          case "landing":
            return <LandingPage />;
          case "login":
            return <LoginPage />;
          case "register":
            return <RegisterPage />;
          case "onboarding":
            return <OnboardingPage />;
          case "browse":
            return <BrowsePage />;
          case "browse-projects":
            return <BrowseProjectsPage />;
          case "project-detail":
            return <ProjectDetailPage />;
          case "profile":
            return <ProfilePage />;
          case "forgot-password":
            return <ForgotPasswordPage />;
          case "reset-password":
            return <ResetPasswordPage />;
          case "verify-email":
            return <VerifyEmailPage />;
          case "dashboard":
            return <DashboardHomePage />;
          case "dashboard/purchases":
            return <DashboardPurchasesPage />;
          case "dashboard/earnings":
            return <DashboardEarningsPage />;
          case "dashboard/withdraw":
            return <DashboardWithdrawPage />;
          case "dashboard/portfolio":
            return <DashboardPortfolioPage />;
          case "dashboard/reviews":
            return <DashboardReviewsPage />;
          case "dashboard/messages":
            return <DashboardMessagesPage />;
          case "dashboard/settings":
            return <DashboardSettingsPage />;
          case "dashboard/analytics":
            return <DashboardAnalyticsPage />;
          case "dashboard/wishlist":
            return <DashboardWishlistPage />;
          case "dashboard/tracking":
            return <DashboardTrackingPage />;
          case "dashboard/my-projects":
            return <DashboardMyProjectsPage />;
          case "admin":
            return <AdminOverviewPage />;
          case "admin/users":
            return <AdminUsersPage />;
          case "admin/transactions":
            return <AdminTransactionsPage />;
          case "admin/payouts":
            return <AdminPayoutsPage />;
          case "admin/commissions":
            return <AdminCommissionsPage />;
          case "admin/disputes":
            return <AdminDisputesPage />;
          case "admin/reviews":
            return <AdminReviewsPage />;
          case "admin/notifications":
            return <AdminNotificationsPage />;
          case "admin/settings":
            return <AdminSettingsPage />;
          case "admin/audit-log":
            return <AdminAuditLogPage />;
          case "mod/applications":
            return <ModApplicationsPage />;
          case "mod/reviews":
            return <ModReviewsPage />;
          case "mod/users":
            return <ModUsersPage />;
          case "notifications":
            return <NotificationsPage />;
          case "activity":
            return <ActivityPage />;
          case "saved-authors":
            return <SavedAuthorsPage />;
          case "help":
            return <HelpPage />;
          case "support":
            return <SupportPage />;
          case "disputes":
            return <DisputesPage />;
          case "transaction-detail":
            return <TransactionDetailPage />;
          default:
            return <LandingPage />;
        }
      })()}
    </Suspense>
    </ErrorBoundary>
  );
}

export default function Home() {
  const { currentPage, navigate } = useNavigationStore();
  const { isAuthenticated, isLoading, user, checkAuth } = useAuthStore();

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Redirect based on auth state
  useEffect(() => {
    if (isLoading) return;

    // If user is authenticated and on a public-only page (login, register, forgot-password), redirect to dashboard
    if (isAuthenticated && (currentPage === "login" || currentPage === "register" || currentPage === "forgot-password")) {
      navigate("dashboard");
    }

    // If user is not authenticated and trying to access a protected page, redirect to landing
    if (!isAuthenticated && !isPublicPage(currentPage) && currentPage !== "onboarding" && currentPage !== "browse" && currentPage !== "browse-projects" && currentPage !== "project-detail" && currentPage !== "profile" && currentPage !== "reset-password" && currentPage !== "verify-email") {
      navigate("landing");
    }

    // Check role-based access for admin/mod pages
    if (isAuthenticated && user && !isAdminPage(currentPage, user.role)) {
      navigate("dashboard");
    }
  }, [isAuthenticated, isLoading, currentPage, navigate, user]);

  // Show loading while checking auth
  if (isLoading) {
    return <LoadingScreen />;
  }

  const useDashboardLayout = isDashboardPage(currentPage);

  if (useDashboardLayout && isAuthenticated) {
    return (
      <SocketProvider>
        <DashboardShell>
          <PageRenderer page={currentPage} />
        </DashboardShell>
      </SocketProvider>
    );
  }

  return (
    <PublicShell>
      <PageRenderer page={currentPage} />
    </PublicShell>
  );
}
