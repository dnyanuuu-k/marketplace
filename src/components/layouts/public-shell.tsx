"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import { Search, Moon, Sun, Menu, Twitter, Github, Linkedin, Mail, ArrowRight, Shield, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useNavigationStore } from "@/store/navigation";
import { useAuthStore } from "@/store/auth";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { CommandPalette, useCommandPalette } from "@/components/shared/command-palette";
import { SITE_NAME } from "@/lib/brand";

export function PublicShell({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useTheme();
  const { navigate, currentPage } = useNavigationStore();
  const { isAuthenticated } = useAuthStore();
  const commandPalette = useCommandPalette();
  const [email, setEmail] = React.useState("");
  const [subscribed, setSubscribed] = React.useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-[1280px] mx-auto flex items-center h-16 px-4 md:px-6">
          {/* Logo */}
          <button
            onClick={() => navigate("landing")}
            className="flex items-center gap-2 mr-6 shrink-0"
          >
            <div className="size-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">A</span>
            </div>
            <span className="font-semibold text-foreground hidden sm:inline">
              {SITE_NAME}
            </span>
          </button>

          {/* Desktop nav links */}
          <nav className="hidden md:flex items-center gap-6 mr-auto">
            <button
              onClick={() => navigate("browse")}
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                currentPage === "browse"
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              Browse
            </button>
          </nav>

          {/* Search */}
          <div className="hidden md:flex flex-1 max-w-sm mx-4">
            <button
              onClick={() => commandPalette.setOpen(true)}
              className="flex items-center gap-2 w-full h-9 px-3 rounded-md bg-muted/50 border-0 text-sm text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <Search className="size-4" />
              <span className="flex-1 text-left">Search authors, services...</span>
              <kbd className="pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                <span className="text-xs">⌘</span>K
              </kbd>
            </button>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 ml-auto md:ml-0">
            {/* Theme toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="size-9"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>

            {isAuthenticated ? (
              <Button onClick={() => navigate("dashboard")} size="sm">
                Dashboard
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("login")}
                  className="hidden sm:inline-flex"
                >
                  Log in
                </Button>
                <Button
                  size="sm"
                  onClick={() => navigate("register")}
                >
                  Sign up
                </Button>
              </>
            )}

            {/* Mobile menu */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden size-9">
                  <Menu className="size-5" />
                  <span className="sr-only">Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <SheetHeader>
                  <SheetTitle>Navigation</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-2 mt-4">
                  <Button
                    variant="ghost"
                    className="justify-start"
                    onClick={() => navigate("browse")}
                  >
                    Browse
                  </Button>
                  {!isAuthenticated ? (
                    <>
                      <Button
                        variant="ghost"
                        className="justify-start"
                        onClick={() => navigate("login")}
                      >
                        Log in
                      </Button>
                      <Button
                        className="justify-start"
                        onClick={() => navigate("register")}
                      >
                        Sign up
                      </Button>
                    </>
                  ) : (
                    <Button
                      className="justify-start"
                      onClick={() => navigate("dashboard")}
                    >
                      Dashboard
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30 mt-auto">
        {/* Social proof bar */}
        <div className="border-b border-border/50">
          <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-4">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Shield className="size-4 text-emerald-500" />
              <span className="font-medium text-foreground">Trusted by 10,000+ users</span>
              <span className="hidden sm:inline">· Secure transactions since 2024</span>
              <Users className="size-4 text-violet-500 sm:inline hidden" />
            </div>
          </div>
        </div>

        <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-12 md:py-16">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 md:gap-6">
            {/* Brand + newsletter column */}
            <div className="col-span-2 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="size-8 rounded-lg bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-sm">A</span>
                </div>
                <span className="font-semibold">{SITE_NAME}</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6 max-w-sm">
                Premium digital products from Albos Technology — HRMS, garage software, and enterprise solutions for growing businesses.
              </p>

              {/* Newsletter signup */}
              <div className="mb-6">
                <p className="text-sm font-medium mb-2">Stay in the loop</p>
                {subscribed ? (
                  <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                    <Shield className="size-4" />
                    <span>Thanks for subscribing!</span>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-9 text-sm max-w-[220px]"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && email.includes("@")) {
                          setSubscribed(true);
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                      onClick={() => {
                        if (email.includes("@")) setSubscribed(true);
                      }}
                    >
                      Subscribe
                      <ArrowRight className="ml-1 size-3.5" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Social icons */}
              <div className="flex items-center gap-3">
                <a
                  href="#"
                  className="size-9 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                  aria-label="Twitter"
                >
                  <Twitter className="size-4" />
                </a>
                <a
                  href="#"
                  className="size-9 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                  aria-label="GitHub"
                >
                  <Github className="size-4" />
                </a>
                <a
                  href="#"
                  className="size-9 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                  aria-label="LinkedIn"
                >
                  <Linkedin className="size-4" />
                </a>
                <a
                  href="#"
                  className="size-9 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                  aria-label="Email"
                >
                  <Mail className="size-4" />
                </a>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-4">Platform</h4>
              <ul className="space-y-2.5">
                <li>
                  <button
                    onClick={() => navigate("browse")}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Browse Creators
                  </button>
                </li>
                <li>
                  <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    How It Works
                  </button>
                </li>
                <li>
                  <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Pricing
                  </button>
                </li>
                <li>
                  <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    For Sellers
                  </button>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-4">Support</h4>
              <ul className="space-y-2.5">
                <li>
                  <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Help Center
                  </button>
                </li>
                <li>
                  <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Contact Us
                  </button>
                </li>
                <li>
                  <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Community
                  </button>
                </li>
                <li>
                  <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Status Page
                  </button>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-4">Legal</h4>
              <ul className="space-y-2.5">
                <li>
                  <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Terms of Service
                  </button>
                </li>
                <li>
                  <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Privacy Policy
                  </button>
                </li>
                <li>
                  <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Cookie Policy
                  </button>
                </li>
                <li>
                  <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Acceptable Use
                  </button>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-12 pt-6 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Built with Next.js & shadcn/ui</span>
              <span className="hidden sm:inline">·</span>
              <span className="hidden sm:inline">Made with ❤️ for creators</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Command Palette */}
      <CommandPalette open={commandPalette.open} onOpenChange={commandPalette.onOpenChange} />
    </div>
  );
}
