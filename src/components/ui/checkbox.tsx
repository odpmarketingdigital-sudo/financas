import { cn } from "@/lib/utils";
import type { InputHTMLAttributes } from "react";

interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  description?: string;
}

export function Checkbox({
  className,
  label,
  description,
  id,
  ...props
}: CheckboxProps) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 transition hover:bg-slate-50",
        props.disabled && "cursor-not-allowed opacity-60",
        className,
      )}
    >
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 accent-teal-700 outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40"
        {...props}
      />
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        {description && (
          <span className="text-xs text-slate-500">{description}</span>
        )}
      </span>
    </label>
  );
}
