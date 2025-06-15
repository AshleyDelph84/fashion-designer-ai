"use client";

import { Card, CardContent } from "./card";
import { cn } from "@/lib/utils";

interface StyleCardProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}

export function StyleCard({ 
  title, 
  description, 
  icon, 
  selected = false, 
  onClick, 
  className 
}: StyleCardProps) {
  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all duration-200 hover:scale-105",
        "bg-slate-800/50 border-slate-700",
        selected && "ring-2 ring-pink-400 bg-pink-500/10 border-pink-400",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-6 text-center">
        {icon && (
          <div className="mb-4 flex justify-center">
            <div className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center",
              selected ? "bg-pink-500/20" : "bg-slate-700/50"
            )}>
              {icon}
            </div>
          </div>
        )}
        <h3 className="font-semibold text-white mb-2">{title}</h3>
        {description && (
          <p className="text-sm text-slate-400">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}