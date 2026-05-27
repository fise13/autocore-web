"use client";

import { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { motionStagger } from "@/lib/motion";

type FadeInProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "section" | "article" | "li";
};

export function FadeIn({ children, className, delay = 0, as: Tag = "div" }: FadeInProps) {
  return (
    <Tag
      className={cn("animate-autocore-fade-in-up", className)}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}

type StaggerGroupProps = {
  children: ReactNode;
  className?: string;
  staggerMs?: number;
};

export function StaggerGroup({ children, className, staggerMs = 55 }: StaggerGroupProps) {
  return (
    <div className={className}>
      {Array.isArray(children)
        ? children.map((child, index) => (
            <div
              key={index}
              className="animate-autocore-fade-in-up"
              style={{ animationDelay: motionStagger(index, staggerMs) }}
            >
              {child}
            </div>
          ))
        : children}
    </div>
  );
}
