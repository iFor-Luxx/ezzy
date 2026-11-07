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
        default: "bg-[#0071e3] text-white shadow hover:bg-[#0077ed]",
        secondary: "bg-[#e8e8ed] text-[#1d1d1f] hover:bg-[#d2d2d7]",
        outline: "border border-[#d2d2d7] bg-white hover:bg-[#f5f5f7]",
        ghost: "hover:bg-[#f5f5f7]",
        destructive: "bg-[#cf222e] text-white shadow hover:bg-[#b91c22]",
      },
      size: {
        default: "h-9 px-4",
        sm: "h-8 px-3 text-[13px]",
        lg: "h-11 px-6",
        icon: "h-9 w-9",
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
    <section aria-label={props.label ?? props.title ?? "tarjeta"} className="ez-card p-5">
      {(props.title || props.action) && (
        <div className="mb-1 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            {props.icon ? <span className="text-[#0071e3]">{props.icon}</span> : null}
            {props.title ? <h2 className="text-[17px] font-semibold tracking-tight">{props.title}</h2> : null}
          </div>
          {props.action}
        </div>
      )}
      {props.sub ? <p className="mb-3 text-[13px] text-[#6e6e73]">{props.sub}</p> : null}
      {props.children}
    </section>
  );
}

export function Field(props: { label: string; htmlFor: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={props.htmlFor} className="text-[13px] font-medium">{props.label}</label>
      {props.children}
      {props.hint ? <p className="text-xs text-[#6e6e73]">{props.hint}</p> : null}
    </div>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "flex h-10 w-full rounded-xl border border-[#d2d2d7] bg-white px-3 text-sm shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] placeholder:text-[#86868b] focus:border-[#0071e3]",
        props.className
      )}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "flex min-h-[88px] w-full rounded-xl border border-[#d2d2d7] bg-white px-3 py-2 text-sm shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] placeholder:text-[#86868b] focus:border-[#0071e3]",
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
        "flex h-10 w-full items-center justify-between rounded-xl border border-[#d2d2d7] bg-white px-3 text-sm shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] focus:border-[#0071e3] [&>span]:truncate",
        props.className
      )}
    >
      <SelectPrimitive.Value />
      <SelectPrimitive.Icon asChild>
        <ChevronDown size={15} className="shrink-0 text-[#86868b]" />
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
          "z-50 max-h-64 min-w-[10rem] overflow-auto rounded-2xl border border-[#e8e8ed] bg-white p-1.5 shadow-xl",
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
        "relative flex cursor-pointer select-none items-center rounded-xl py-2 pl-8 pr-3 text-sm outline-none focus:bg-[#f5f5f7] data-[state=checked]:font-medium",
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
        default: "border-[#e8e8ed] bg-[#f5f5f7] text-[#1d1d1f]",
        ok: "border-[#1a7f37]/30 bg-[#1a7f37]/10 text-[#1a7f37]",
        warn: "border-[#9a6700]/30 bg-[#9a6700]/10 text-[#9a6700]",
        bad: "border-[#cf222e]/30 bg-[#cf222e]/10 text-[#cf222e]",
        info: "border-[#0071e3]/30 bg-[#0071e3]/10 text-[#0071e3]",
      },
    },
    defaultVariants: { tone: "default" },
  }
);

export function Badge(props: { tone?: "default" | "ok" | "warn" | "bad" | "info"; children: React.ReactNode }) {
  return <span className={badgeVariants({ tone: props.tone })}>{props.children}</span>;
}

export function Empty(props: { children: React.ReactNode }) {
  return <p className="py-4 text-center text-[13px] text-[#6e6e73]">{props.children}</p>;
}

export function Stat(props: { label: string; value: string }) {
  return (
    <div className="ez-card px-4 py-3">
      <p className="text-xs text-[#6e6e73]">{props.label}</p>
      <p className="text-xl font-semibold tracking-tight">{props.value}</p>
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
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-30 max-h-[85vh] w-full max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-2xl bg-white p-6 shadow-2xl">
          <DialogPrimitive.Title className="mb-3 text-lg font-semibold tracking-tight">{props.title}</DialogPrimitive.Title>
          {props.children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
