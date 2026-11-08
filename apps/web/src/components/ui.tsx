import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import * as SelectPrimitive from "@radix-ui/react-select";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "../lib/cn";

// shadcn/ui · variantes y API estándar (button, card, badge, input, dialog, tabs).
const buttonVariants = cva(
  "ez-btn inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground active:brightness-95",
        secondary: "bg-secondary text-secondary-foreground hover:bg-muted",
        outline: "border border-border bg-card hover:bg-muted",
        ghost: "hover:bg-muted",
        destructive: "bg-destructive text-white active:brightness-95",
      },
      size: {
        default: "h-8 px-3.5 text-[13px] sm:h-9 sm:px-4 sm:text-sm",
        sm: "h-8 px-3 text-[13px]",
        lg: "h-9 px-4 text-sm sm:h-10 sm:px-5",
        icon: "h-8 w-8 sm:h-9 sm:w-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>) {
  const { variant, size, className, ...rest } = props;
  return <button {...rest} className={cn(buttonVariants({ variant, size }), className)} />;
}

export function Card(props: { title?: string; sub?: string; icon?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; label?: string }) {
  return (
    <section aria-label={props.label ?? props.title ?? "tarjeta"} className="ez-card p-4">
      {(props.title || props.action) && (
        <div className="mb-1 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            {props.icon ? <span className="text-primary">{props.icon}</span> : null}
            {props.title ? <h2 className="text-base font-semibold tracking-tight sm:text-[17px]">{props.title}</h2> : null}
          </div>
          {props.action}
        </div>
      )}
      {props.sub ? <p className="mb-3 text-[13px] text-muted-foreground">{props.sub}</p> : null}
      {props.children}
    </section>
  );
}

export function Field(props: { label: string; htmlFor: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={props.htmlFor} className="text-[13px] font-medium">{props.label}</label>
      {props.children}
      {props.hint ? <p className="text-xs text-muted-foreground">{props.hint}</p> : null}
    </div>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      autoComplete="off"
      {...props}
      className={cn(
        "flex h-8 w-full rounded-xl border border-transparent bg-muted px-3 text-[13px] placeholder:text-muted-foreground focus:border-ring focus:bg-card sm:h-9 sm:text-sm",
        props.className
      )}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      autoComplete="off"
      {...props}
      className={cn(
        "flex min-h-[72px] w-full rounded-xl border border-transparent bg-muted px-3 py-2 text-[13px] placeholder:text-muted-foreground focus:border-ring focus:bg-card sm:text-sm",
        props.className
      )}
    />
  );
}

// shadcn Select real (Radix): el desplegable se renderiza custom, no el menú nativo del SO.
export const Select = SelectPrimitive.Root;

export function SelectTrigger(props: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      {...props}
      className={cn(
        "flex h-8 w-full items-center justify-between rounded-xl border border-transparent bg-muted px-3 text-[13px] focus:border-ring focus:bg-card sm:h-9 sm:text-sm [&>span]:truncate",
        props.className
      )}
    >
      <SelectPrimitive.Value />
      <SelectPrimitive.Icon asChild>
        <ChevronDown size={15} className="shrink-0 text-muted-foreground" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

export function SelectContent(props: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        {...props}
        position="popper"
        sideOffset={6}
        className={cn(
          "z-50 max-h-64 min-w-[10rem] overflow-auto rounded-2xl border border-black/[0.06] bg-card p-1.5 shadow-[0_8px_30px] shadow-black/10",
          props.className
        )}
      >
        <SelectPrimitive.Viewport>{props.children}</SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

export function SelectItem(props: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      {...props}
      className={cn(
        "relative flex cursor-pointer select-none items-center rounded-xl py-2 pl-8 pr-3 text-sm outline-none focus:bg-muted data-[state=checked]:font-medium",
        props.className
      )}
    >
      <span className="absolute left-2 flex items-center">
        <SelectPrimitive.ItemIndicator>
          <Check size={14} />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{props.children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      tone: {
        default: "border-border bg-muted text-foreground",
        ok: "border-chart-2/30 bg-chart-2/10 text-chart-2",
        warn: "border-chart-4/30 bg-chart-4/10 text-chart-4",
        bad: "border-destructive/30 bg-destructive/10 text-destructive",
        info: "border-primary/30 bg-primary/10 text-primary",
      },
    },
    defaultVariants: { tone: "default" },
  }
);

export function Badge(props: { tone?: "default" | "ok" | "warn" | "bad" | "info"; children: React.ReactNode }) {
  return <span className={badgeVariants({ tone: props.tone })}>{props.children}</span>;
}

export function Empty(props: { children: React.ReactNode }) {
  return <p className="py-4 text-center text-[13px] text-muted-foreground">{props.children}</p>;
}

export function Stat(props: { label: string; value: string }) {
  return (
    <div className="ez-card px-4 py-3">
      <p className="text-xs text-muted-foreground">{props.label}</p>
      <p className="text-lg font-semibold tracking-tight sm:text-xl">{props.value}</p>
    </div>
  );
}

export function Dialog(props: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <DialogPrimitive.Root
      open
      onOpenChange={(o) => {
        if (!o) props.onClose();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-30 max-h-[85vh] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-2xl border border-black/[0.06] bg-card p-4 shadow-[0_8px_30px] shadow-black/10 sm:p-6">
          <DialogPrimitive.Title className="mb-3 text-base font-semibold tracking-tight sm:text-lg">{props.title}</DialogPrimitive.Title>
          {props.children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
