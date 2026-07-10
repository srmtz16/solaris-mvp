import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium", {
  variants: {
    variant: {
      default: "bg-primary/10 text-primary",
      secondary: "bg-muted text-muted-foreground",
      success: "bg-green-50 text-green-700",
      warning: "bg-yellow-50 text-yellow-700",
      destructive: "bg-red-50 text-red-700",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}
