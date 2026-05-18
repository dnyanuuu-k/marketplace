"use client"

import * as React from "react"
import { Check, ChevronLeft, ChevronRight } from "lucide-react"
import { motion } from "framer-motion"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

export interface StepWizardProps {
  steps: { title: string; description?: string }[]
  currentStep: number
  onStepChange: (step: number) => void
  canAdvance?: boolean
  children: React.ReactNode
}

export function StepWizard({
  steps,
  currentStep,
  onStepChange,
  canAdvance = true,
  children,
}: StepWizardProps) {
  const isFirst = currentStep === 0
  const isLast = currentStep === steps.length - 1
  const progressPercent = ((currentStep + 1) / steps.length) * 100

  const goBack = () => {
    if (!isFirst) onStepChange(currentStep - 1)
  }

  const goForward = () => {
    if (!isLast && canAdvance) onStepChange(currentStep + 1)
  }

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="space-y-2">
        <Progress value={progressPercent} className="h-2" />
        <p className="text-xs text-muted-foreground text-right">
          Step {currentStep + 1} of {steps.length}
        </p>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-2">
        {steps.map((step, idx) => {
          const isCompleted = idx < currentStep
          const isCurrent = idx === currentStep

          return (
            <React.Fragment key={idx}>
              {idx > 0 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 rounded-full transition-colors",
                    idx <= currentStep ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
              <button
                type="button"
                onClick={() => {
                  if (idx < currentStep) onStepChange(idx)
                }}
                disabled={idx > currentStep}
                className={cn(
                  "flex items-center gap-2 shrink-0 transition-all",
                  idx > currentStep && "opacity-50 cursor-not-allowed",
                  idx < currentStep && "cursor-pointer"
                )}
              >
                <div
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full text-xs font-semibold transition-colors border-2",
                    isCompleted && "bg-primary border-primary text-primary-foreground",
                    isCurrent && "bg-primary/10 border-primary text-primary",
                    !isCompleted && !isCurrent && "bg-muted border-muted-foreground/25 text-muted-foreground"
                  )}
                >
                  {isCompleted ? <Check className="size-4" /> : idx + 1}
                </div>
                <div className="hidden sm:block text-left">
                  <p
                    className={cn(
                      "text-sm font-medium leading-tight",
                      isCurrent ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {step.title}
                  </p>
                  {step.description && (
                    <p className="text-xs text-muted-foreground leading-tight">
                      {step.description}
                    </p>
                  )}
                </div>
              </button>
            </React.Fragment>
          )
        })}
      </div>

      {/* Content */}
      <motion.div
        key={currentStep}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button
          variant="outline"
          onClick={goBack}
          disabled={isFirst}
        >
          <ChevronLeft className="size-4 mr-1" />
          Back
        </Button>
        <div className="flex items-center gap-2">
          {isLast ? (
            <Button onClick={goForward} disabled={!canAdvance}>
              Complete
            </Button>
          ) : (
            <Button onClick={goForward} disabled={!canAdvance}>
              Next
              <ChevronRight className="size-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
