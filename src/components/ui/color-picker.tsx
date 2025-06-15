"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

const colors = [
  { name: "Black", value: "#000000" },
  { name: "White", value: "#FFFFFF" },
  { name: "Gray", value: "#6B7280" },
  { name: "Navy", value: "#1E3A8A" },
  { name: "Blue", value: "#3B82F6" },
  { name: "Red", value: "#EF4444" },
  { name: "Pink", value: "#EC4899" },
  { name: "Purple", value: "#8B5CF6" },
  { name: "Green", value: "#10B981" },
  { name: "Yellow", value: "#F59E0B" },
  { name: "Orange", value: "#F97316" },
  { name: "Brown", value: "#A3764D" },
];

interface ColorPickerProps {
  selectedColors: string[];
  onColorToggle: (color: string) => void;
  maxSelection?: number;
  className?: string;
}

export function ColorPicker({ 
  selectedColors, 
  onColorToggle, 
  maxSelection, 
  className 
}: ColorPickerProps) {
  const handleColorClick = (colorValue: string) => {
    if (selectedColors.includes(colorValue)) {
      onColorToggle(colorValue);
    } else if (!maxSelection || selectedColors.length < maxSelection) {
      onColorToggle(colorValue);
    }
  };

  return (
    <div className={cn("grid grid-cols-4 sm:grid-cols-6 gap-3", className)}>
      {colors.map((color) => {
        const isSelected = selectedColors.includes(color.value);
        const canSelect = !maxSelection || selectedColors.length < maxSelection || isSelected;
        
        return (
          <button
            key={color.value}
            onClick={() => handleColorClick(color.value)}
            disabled={!canSelect}
            className={cn(
              "relative w-12 h-12 rounded-full border-2 transition-all duration-200",
              "hover:scale-110 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:ring-offset-2 focus:ring-offset-slate-900",
              isSelected && "ring-2 ring-pink-400 ring-offset-2 ring-offset-slate-900",
              !canSelect && "opacity-50 cursor-not-allowed",
              color.value === "#FFFFFF" && "border-slate-400",
              color.value !== "#FFFFFF" && "border-slate-600"
            )}
            style={{ backgroundColor: color.value }}
            title={color.name}
          >
            {isSelected && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Check 
                  className={cn(
                    "w-5 h-5",
                    color.value === "#FFFFFF" || color.value === "#F59E0B" || color.value === "#FBBF24" 
                      ? "text-black" 
                      : "text-white"
                  )} 
                />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}