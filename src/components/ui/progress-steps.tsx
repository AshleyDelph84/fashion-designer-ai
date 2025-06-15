"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface Step {
  title: string;
  description?: string;
}

interface ProgressStepsProps {
  steps: Step[];
  currentStep: number;
  className?: string;
}

export function ProgressSteps({ steps, currentStep, className }: ProgressStepsProps) {
  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          
          return (
            <div key={index} className="flex flex-col items-center flex-1">
              {/* Step Circle */}
              <div className="flex items-center w-full">
                {index > 0 && (
                  <div className={cn(
                    "flex-1 h-1 mx-2",
                    isCompleted || (isCurrent && index > 0) ? "bg-pink-400" : "bg-slate-600"
                  )} />
                )}
                
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors",
                  isCompleted && "bg-pink-400 border-pink-400 text-white",
                  isCurrent && "border-pink-400 text-pink-400 bg-pink-400/10",
                  !isCompleted && !isCurrent && "border-slate-600 text-slate-400"
                )}>
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span className="text-sm font-semibold">{stepNumber}</span>
                  )}
                </div>
                
                {index < steps.length - 1 && (
                  <div className={cn(
                    "flex-1 h-1 mx-2",
                    isCompleted ? "bg-pink-400" : "bg-slate-600"
                  )} />
                )}
              </div>
              
              {/* Step Label */}
              <div className="mt-3 text-center max-w-32">
                <div className={cn(
                  "text-sm font-medium",
                  isCurrent && "text-pink-400",
                  isCompleted && "text-white",
                  !isCompleted && !isCurrent && "text-slate-400"
                )}>
                  {step.title}
                </div>
                {step.description && (
                  <div className="text-xs text-slate-500 mt-1">
                    {step.description}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}