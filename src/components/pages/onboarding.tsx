"use client";

import React, { useState, useCallback } from "react";
import {
  User,
  Briefcase,
  Link2,
  CreditCard,
  CheckCircle2,
  X,
  Plus,
  Github,
  Linkedin,
  Twitter,
  Globe,
  AlertTriangle,
  Upload,
  Check,
  ExternalLink,
  Loader2,
  Camera,
  Save,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { StepWizard } from "@/components/shared/step-wizard";
import { useNavigationStore } from "@/store/navigation";
import { useAuthStore } from "@/store/auth";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { apiPatch } from "@/lib/api-client";

const STEPS = [
  { title: "Personal Details", description: "Basic info" },
  { title: "Skills & Expertise", description: "Your talents" },
  { title: "Social Links", description: "Connect accounts" },
  { title: "Stripe Connect", description: "Get paid" },
  { title: "Review & Submit", description: "Almost done" },
];

const SKILL_SUGGESTIONS = [
  "UI/UX Design",
  "Web Development",
  "Mobile Development",
  "Logo Design",
  "Brand Identity",
  "Illustration",
  "Copywriting",
  "SEO",
  "Data Analysis",
  "Video Editing",
  "3D Modeling",
  "Photography",
  "App Design",
  "WordPress",
  "React",
  "Node.js",
  "Python",
  "TypeScript",
  "Figma",
  "Photoshop",
];

// Skill categories for visual grouping
const SKILL_CATEGORIES: Record<string, string[]> = {
  "Design": ["UI/UX Design", "Logo Design", "Brand Identity", "Illustration", "Figma", "Photoshop", "App Design"],
  "Development": ["Web Development", "Mobile Development", "React", "Node.js", "Python", "TypeScript", "WordPress"],
  "Marketing": ["Copywriting", "SEO", "Data Analysis"],
  "Media": ["Video Editing", "3D Modeling", "Photography"],
};

function isValidUrl(str: string): boolean {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

// Validation indicator component
function ValidationIndicator({
  valid,
  text,
}: {
  valid: boolean;
  text: string;
}) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      {valid ? (
        <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
      ) : (
        <X className="size-3.5 text-red-500 dark:text-red-400" />
      )}
      <span
        className={
          valid
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-red-500 dark:text-red-400"
        }
      >
        {text}
      </span>
    </div>
  );
}

// Step validation summary
function StepValidationSummary({
  step,
  validations,
}: {
  step: number;
  validations: { label: string; valid: boolean }[];
}) {
  const allValid = validations.every((v) => v.valid);
  const validCount = validations.filter((v) => v.valid).length;
  const total = validations.length;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="space-y-2 p-3 rounded-lg border border-border bg-muted/30"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Step {step + 1} Validation
        </span>
        <span
          className={`text-xs font-semibold ${
            allValid
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-amber-600 dark:text-amber-400"
          }`}
        >
          {validCount}/{total} passed
        </span>
      </div>
      <div className="space-y-1">
        {validations.map((v, i) => (
          <ValidationIndicator key={i} valid={v.valid} text={v.label} />
        ))}
      </div>
    </motion.div>
  );
}

// Review info card
function ReviewInfoCard({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border">
          <h4 className="text-sm font-semibold">{title}</h4>
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="text-xs h-7"
          >
            Edit
          </Button>
        </div>
        <div className="p-4">{children}</div>
      </CardContent>
    </Card>
  );
}

export function OnboardingPage() {
  const { navigate } = useNavigationStore();
  const { user, updateUser } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Step 1: Personal Details
  const [name, setName] = useState(user?.name || "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatarUrl || null);
  const [avatarFileName, setAvatarFileName] = useState<string | null>(null);
  const [bio, setBio] = useState(user?.profile?.bio || "");
  const [location, setLocation] = useState(user?.profile?.location || "");

  // Step 2: Skills
  const [skills, setSkills] = useState<string[]>(
    user?.profile?.skills ? JSON.parse(user.profile.skills) : []
  );
  const [skillSearch, setSkillSearch] = useState("");

  // Step 3: Social Links
  const socialLinksState = user?.profile?.socialLinks
    ? JSON.parse(user.profile.socialLinks)
    : {};
  const [github, setGithub] = useState((socialLinksState.github as string) || "");
  const [linkedin, setLinkedin] = useState((socialLinksState.linkedin as string) || "");
  const [twitter, setTwitter] = useState((socialLinksState.twitter as string) || "");
  const [portfolio, setPortfolio] = useState((socialLinksState.portfolio as string) || "");

  // Step 4: Stripe
  const [stripeConnected, setStripeConnected] = useState(!!user?.stripeAccountId);
  const [stripeConnecting, setStripeConnecting] = useState(false);
  const [stripeSkipped, setStripeSkipped] = useState(false);

  // Step 5: Review
  const [termsAccepted, setTermsAccepted] = useState(false);

  const handleAvatarUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be under 5MB");
        return;
      }
      setAvatarFileName(file.name);
      const reader = new FileReader();
      reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  }, []);

  const addSkill = (skill: string) => {
    const trimmed = skill.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
    }
    setSkillSearch("");
  };

  const removeSkill = (skill: string) => {
    setSkills(skills.filter((s) => s !== skill));
  };

  const filteredSuggestions = SKILL_SUGGESTIONS.filter(
    (s) =>
      s.toLowerCase().includes(skillSearch.toLowerCase()) &&
      !skills.includes(s)
  );

  const handleStripeConnect = () => {
    setStripeConnecting(true);
    setTimeout(() => {
      setStripeConnected(true);
      setStripeSkipped(false);
      setStripeConnecting(false);
      toast.success("Stripe connected successfully!");
    }, 2000);
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 0:
        return name.trim().length > 0;
      case 1:
        return skills.length >= 3;
      case 2: {
        const links = [github, linkedin, twitter, portfolio].filter(Boolean);
        return links.every((l) => isValidUrl(l)) || links.length === 0;
      }
      case 3:
        return true;
      case 4:
        return termsAccepted;
      default:
        return true;
    }
  };

  // Get step validations for display
  const getStepValidations = (step: number): { label: string; valid: boolean }[] => {
    switch (step) {
      case 0:
        return [
          { label: "Display name is required", valid: name.trim().length > 0 },
          { label: "Profile photo uploaded", valid: !!avatarPreview },
          { label: "Bio provided", valid: bio.trim().length > 0 },
          { label: "Location set", valid: location.trim().length > 0 },
        ];
      case 1:
        return [
          { label: "At least 3 skills added", valid: skills.length >= 3 },
          { label: "5+ skills recommended", valid: skills.length >= 5 },
        ];
      case 2:
        return [
          { label: "All URLs are valid", valid: [github, linkedin, twitter, portfolio].filter(Boolean).every((l) => isValidUrl(l)) || [github, linkedin, twitter, portfolio].filter(Boolean).length === 0 },
          { label: "At least one link added", valid: [github, linkedin, twitter, portfolio].some(Boolean) },
        ];
      case 3:
        return [
          { label: "Stripe connected or skipped", valid: stripeConnected || stripeSkipped },
        ];
      case 4:
        return [
          { label: "Terms accepted", valid: termsAccepted },
        ];
      default:
        return [];
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const socialLinksObj: Record<string, string> = {};
      if (github) socialLinksObj.github = github;
      if (linkedin) socialLinksObj.linkedin = linkedin;
      if (twitter) socialLinksObj.twitter = twitter;
      if (portfolio) socialLinksObj.portfolio = portfolio;

      const data = await apiPatch("/api/users/me", {
        name: name.trim(),
        bio: bio.trim() || null,
        location: location.trim() || null,
        skills,
        socialLinks: socialLinksObj,
        avatarUrl: avatarPreview,
      });

      const res = data as { data: unknown };
      updateUser(res.data);
      setSubmitted(true);
    } catch {
      toast.error("Failed to submit. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save & Continue Later
  const handleSaveAndContinue = async () => {
    try {
      const socialLinksObj: Record<string, string> = {};
      if (github) socialLinksObj.github = github;
      if (linkedin) socialLinksObj.linkedin = linkedin;
      if (twitter) socialLinksObj.twitter = twitter;
      if (portfolio) socialLinksObj.portfolio = portfolio;

      const data = await apiPatch("/api/users/me", {
        name: name.trim(),
        bio: bio.trim() || null,
        location: location.trim() || null,
        skills,
        socialLinks: socialLinksObj,
        avatarUrl: avatarPreview,
      });

      const res = data as { data: unknown };
      updateUser(res.data);
      toast.success("Progress saved! You can continue later from Settings.");
      navigate("dashboard");
    } catch {
      toast.error("Failed to save. Please try again.");
    }
  };

  const canAdvance = validateStep(currentStep);
  const progressPercent = ((currentStep + 1) / STEPS.length) * 100;

  if (submitted) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="size-20 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle2 className="size-10 text-emerald-600 dark:text-emerald-400" />
          </motion.div>
          <h2 className="text-2xl font-bold mb-2">Profile Submitted!</h2>
          <p className="text-muted-foreground mb-2">
            Your author profile has been submitted for review. You&apos;ll be
            able to start selling once approved.
          </p>
          <p className="text-sm text-muted-foreground mb-8">
            In the meantime, you can set up your portfolio and explore the
            marketplace.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => navigate("dashboard/portfolio")}>
              <Briefcase className="size-4 mr-1" />
              Set Up Portfolio
            </Button>
            <Button variant="outline" onClick={() => navigate("dashboard")}>
              Go to Dashboard
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl">
        {/* Progress percentage */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              Profile Setup
            </span>
            <span className="text-sm font-bold text-primary">
              {Math.round(progressPercent)}% Complete
            </span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        <StepWizard
          steps={STEPS}
          currentStep={currentStep}
          onStepChange={setCurrentStep}
          canAdvance={canAdvance}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
            >
              {currentStep === 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Tell us about yourself</CardTitle>
                    <CardDescription>
                      Help others get to know you with some basic information
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Avatar upload with preview */}
                    <div className="flex items-start gap-4">
                      <div className="relative group">
                        <Avatar className="size-20 ring-2 ring-border group-hover:ring-primary/50 transition-all">
                          {avatarPreview ? (
                            <AvatarImage src={avatarPreview} alt="Avatar" />
                          ) : (
                            <AvatarFallback className="text-xl bg-primary/10 text-primary">
                              {name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .slice(0, 2) || "?"}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        {avatarPreview && (
                          <div className="absolute -bottom-1 -right-1 size-6 rounded-full bg-emerald-500 flex items-center justify-center ring-2 ring-background">
                            <Check className="size-3 text-white" />
                          </div>
                        )}
                        <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                          <Camera className="size-5 text-white" />
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={handleAvatarUpload}
                          />
                        </label>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Profile Photo</p>
                        <p className="text-xs text-muted-foreground mb-2">
                          Click to upload. JPG, PNG up to 5MB.
                        </p>
                        {avatarFileName && (
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <Check className="size-3" />
                            {avatarFileName}
                          </p>
                        )}
                        {!avatarPreview && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <AlertTriangle className="size-3" />
                            Recommended: Upload a profile photo
                          </p>
                        )}
                      </div>
                    </div>
                    <Separator />

                    <div className="space-y-2">
                      <Label htmlFor="onb-name">
                        Display Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="onb-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your display name"
                        className={name.trim() ? "border-emerald-300 dark:border-emerald-500/50" : ""}
                      />
                      {name.trim() && (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <Check className="size-3" />
                          Name looks good
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="onb-bio">Bio</Label>
                        <span className="text-xs text-muted-foreground">
                          {bio.length}/1000
                        </span>
                      </div>
                      <Textarea
                        id="onb-bio"
                        value={bio}
                        onChange={(e) => setBio(e.target.value.slice(0, 1000))}
                        placeholder="Tell clients about yourself and what you do..."
                        rows={4}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="onb-location">Location</Label>
                      <Input
                        id="onb-location"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="City, Country"
                      />
                    </div>

                    {/* Step validation summary */}
                    <StepValidationSummary
                      step={0}
                      validations={getStepValidations(0)}
                    />
                  </CardContent>
                </Card>
              )}

              {currentStep === 1 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Skills & Expertise</CardTitle>
                    <CardDescription>
                      Add at least 3 skills to help clients find you
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Selected skills */}
                    {skills.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {skills.map((skill) => (
                          <Badge
                            key={skill}
                            variant="secondary"
                            className="px-3 py-1 text-sm gap-1 bg-primary/10 text-primary"
                          >
                            {skill}
                            <button
                              type="button"
                              onClick={() => removeSkill(skill)}
                              className="ml-1 hover:text-destructive transition-colors"
                            >
                              <X className="size-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Search and add skill */}
                    <div className="space-y-2">
                      <Label>Search or add skills</Label>
                      <div className="flex gap-2">
                        <Input
                          value={skillSearch}
                          onChange={(e) => setSkillSearch(e.target.value)}
                          placeholder="Type a skill..."
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && skillSearch.trim()) {
                              e.preventDefault();
                              addSkill(skillSearch);
                            }
                          }}
                        />
                        <Button
                          variant="outline"
                          onClick={() => {
                            if (skillSearch.trim()) addSkill(skillSearch);
                          }}
                          disabled={!skillSearch.trim()}
                        >
                          <Plus className="size-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Skill categories with suggestions */}
                    {filteredSuggestions.length > 0 && (
                      <div className="space-y-4">
                        {Object.entries(SKILL_CATEGORIES).map(
                          ([category, categorySkills]) => {
                            const available = categorySkills.filter(
                              (s) => !skills.includes(s)
                            );
                            if (available.length === 0) return null;

                            return (
                              <div key={category}>
                                <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                                  {category}
                                </Label>
                                <div className="flex flex-wrap gap-2 mt-1.5">
                                  {available
                                    .filter((s) =>
                                      s
                                        .toLowerCase()
                                        .includes(
                                          skillSearch.toLowerCase()
                                        )
                                    )
                                    .slice(0, 6)
                                    .map((suggestion) => (
                                      <button
                                        key={suggestion}
                                        type="button"
                                        onClick={() => addSkill(suggestion)}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors"
                                      >
                                        <Plus className="size-3" />
                                        {suggestion}
                                      </button>
                                    ))}
                                </div>
                              </div>
                            );
                          }
                        )}
                      </div>
                    )}

                    {skills.length < 3 && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <AlertTriangle className="size-3" />
                        Please add at least {3 - skills.length} more skill
                        {3 - skills.length > 1 ? "s" : ""}
                      </p>
                    )}
                    {skills.length >= 3 && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <Check className="size-3" />
                        Minimum skills requirement met
                        {skills.length >= 5 && " — Great selection! ✨"}
                      </p>
                    )}

                    {/* Step validation summary */}
                    <StepValidationSummary
                      step={1}
                      validations={getStepValidations(1)}
                    />
                  </CardContent>
                </Card>
              )}

              {currentStep === 2 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Social Links</CardTitle>
                    <CardDescription>
                      Connect your professional profiles (all optional)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      {
                        icon: Github,
                        label: "GitHub",
                        value: github,
                        set: setGithub,
                        placeholder: "https://github.com/username",
                      },
                      {
                        icon: Linkedin,
                        label: "LinkedIn",
                        value: linkedin,
                        set: setLinkedin,
                        placeholder: "https://linkedin.com/in/username",
                      },
                      {
                        icon: Twitter,
                        label: "Twitter / X",
                        value: twitter,
                        set: setTwitter,
                        placeholder: "https://twitter.com/username",
                      },
                      {
                        icon: Globe,
                        label: "Portfolio Website",
                        value: portfolio,
                        set: setPortfolio,
                        placeholder: "https://your-portfolio.com",
                      },
                    ].map(({ icon: Icon, label, value, set, placeholder }) => (
                      <div key={label} className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Icon className="size-4" />
                          {label}
                          {value && isValidUrl(value) && (
                            <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                          )}
                        </Label>
                        <Input
                          value={value}
                          onChange={(e) => set(e.target.value)}
                          placeholder={placeholder}
                          type="url"
                          className={
                            value && !isValidUrl(value)
                              ? "border-red-300 dark:border-red-500/50"
                              : value && isValidUrl(value)
                              ? "border-emerald-300 dark:border-emerald-500/50"
                              : ""
                          }
                        />
                        {value && !isValidUrl(value) && (
                          <p className="text-xs text-destructive flex items-center gap-1">
                            <X className="size-3" />
                            Please enter a valid URL
                          </p>
                        )}
                      </div>
                    ))}

                    {/* Step validation summary */}
                    <StepValidationSummary
                      step={2}
                      validations={getStepValidations(2)}
                    />
                  </CardContent>
                </Card>
              )}

              {currentStep === 3 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Stripe Connect</CardTitle>
                    <CardDescription>
                      Set up your payment account to receive earnings
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="p-4 rounded-lg bg-muted/50 border">
                      <div className="flex items-start gap-3">
                        <CreditCard className="size-8 text-primary shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium mb-1">
                            Why Stripe Connect?
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Stripe Connect allows you to receive payments
                            directly to your bank account. It&apos;s secure,
                            fast, and handles all the compliance so you can
                            focus on your work.
                          </p>
                        </div>
                      </div>
                    </div>

                    {stripeConnected ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center gap-3 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30"
                      >
                        <CheckCircle2 className="size-6 text-emerald-600 dark:text-emerald-400" />
                        <div>
                          <p className="font-medium text-emerald-700 dark:text-emerald-400">
                            Stripe Connected
                          </p>
                          <p className="text-sm text-emerald-600 dark:text-emerald-400/80">
                            Your payment account is set up and ready to receive
                            payouts.
                          </p>
                        </div>
                      </motion.div>
                    ) : (
                      <>
                        <Button
                          className="w-full"
                          size="lg"
                          onClick={handleStripeConnect}
                          disabled={stripeConnecting}
                        >
                          {stripeConnecting ? (
                            <>
                              <Loader2 className="size-4 mr-2 animate-spin" />
                              Connecting to Stripe...
                            </>
                          ) : (
                            <>
                              <ExternalLink className="size-4 mr-2" />
                              Connect with Stripe
                            </>
                          )}
                        </Button>

                        {!stripeSkipped && (
                          <div className="text-center">
                            <button
                              type="button"
                              onClick={() => setStripeSkipped(true)}
                              className="text-sm text-muted-foreground hover:text-foreground transition-colors underline"
                            >
                              Skip for now
                            </button>
                          </div>
                        )}

                        {stripeSkipped && (
                          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30">
                            <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                            <div className="text-sm">
                              <p className="font-medium text-amber-700 dark:text-amber-400">
                                Stripe not connected
                              </p>
                              <p className="text-amber-600 dark:text-amber-400/80">
                                You won&apos;t be able to receive payouts until
                                you connect your Stripe account. You can set this
                                up later in Settings.
                              </p>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* Step validation summary */}
                    <StepValidationSummary
                      step={3}
                      validations={getStepValidations(3)}
                    />
                  </CardContent>
                </Card>
              )}

              {currentStep === 4 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Review & Submit</CardTitle>
                    <CardDescription>
                      Review your information before submitting
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Personal Details */}
                    <ReviewInfoCard
                      title="Personal Details"
                      onEdit={() => setCurrentStep(0)}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="size-12">
                          {avatarPreview ? (
                            <AvatarImage src={avatarPreview} alt="Avatar" />
                          ) : (
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .slice(0, 2) || "?"}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div>
                          <p className="text-sm font-semibold">
                            {name || "Not set"}
                          </p>
                          {location && (
                            <p className="text-xs text-muted-foreground">
                              {location}
                            </p>
                          )}
                        </div>
                      </div>
                      {bio && (
                        <p className="text-sm text-muted-foreground mt-3 line-clamp-3">
                          {bio}
                        </p>
                      )}
                    </ReviewInfoCard>

                    {/* Skills */}
                    <ReviewInfoCard
                      title="Skills & Expertise"
                      onEdit={() => setCurrentStep(1)}
                    >
                      <div className="flex flex-wrap gap-1.5">
                        {skills.map((skill) => (
                          <Badge
                            key={skill}
                            variant="secondary"
                            className="text-xs bg-primary/10 text-primary"
                          >
                            {skill}
                          </Badge>
                        ))}
                        {skills.length === 0 && (
                          <p className="text-sm text-muted-foreground">
                            No skills added
                          </p>
                        )}
                      </div>
                    </ReviewInfoCard>

                    {/* Social Links */}
                    <ReviewInfoCard
                      title="Social Links"
                      onEdit={() => setCurrentStep(2)}
                    >
                      <div className="space-y-2 text-sm">
                        {github && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Github className="size-4" />
                            <span className="truncate">{github}</span>
                          </div>
                        )}
                        {linkedin && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Linkedin className="size-4" />
                            <span className="truncate">{linkedin}</span>
                          </div>
                        )}
                        {twitter && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Twitter className="size-4" />
                            <span className="truncate">{twitter}</span>
                          </div>
                        )}
                        {portfolio && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Globe className="size-4" />
                            <span className="truncate">{portfolio}</span>
                          </div>
                        )}
                        {!github && !linkedin && !twitter && !portfolio && (
                          <p className="text-muted-foreground text-sm">
                            No social links added
                          </p>
                        )}
                      </div>
                    </ReviewInfoCard>

                    {/* Stripe */}
                    <ReviewInfoCard
                      title="Payment Setup"
                      onEdit={() => setCurrentStep(3)}
                    >
                      <div className="flex items-center gap-2 text-sm">
                        {stripeConnected ? (
                          <>
                            <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                              Stripe connected
                            </span>
                          </>
                        ) : stripeSkipped ? (
                          <>
                            <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
                            <span className="text-amber-600 dark:text-amber-400">
                              Stripe not connected (skipped)
                            </span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">
                            Not connected
                          </span>
                        )}
                      </div>
                    </ReviewInfoCard>

                    {/* Terms */}
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border">
                      <Checkbox
                        id="terms"
                        checked={termsAccepted}
                        onCheckedChange={(checked) =>
                          setTermsAccepted(checked === true)
                        }
                      />
                      <div className="space-y-1">
                        <Label
                          htmlFor="terms"
                          className="text-sm cursor-pointer"
                        >
                          I agree to the Terms of Service and Privacy Policy
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          By submitting, you agree to our platform&apos;s terms
                          and conditions.
                        </p>
                      </div>
                    </div>

                    {/* Step validation summary */}
                    <StepValidationSummary
                      step={4}
                      validations={getStepValidations(4)}
                    />

                    <div className="space-y-3 pt-2">
                      <Button
                        className="w-full"
                        size="lg"
                        disabled={!termsAccepted || isSubmitting}
                        onClick={handleSubmit}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="size-4 mr-2 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            Submit for Approval
                            <Sparkles className="size-4 ml-2" />
                          </>
                        )}
                      </Button>

                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={handleSaveAndContinue}
                        disabled={isSubmitting}
                      >
                        <Save className="size-4 mr-2" />
                        Save & Continue Later
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </AnimatePresence>
        </StepWizard>
      </div>
    </div>
  );
}
