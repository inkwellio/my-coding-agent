import type { ChangeEvent } from "react";
import { Icon } from "../Icon";

interface StageCheckboxProps {
  checked: boolean;
  disabled?: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  "aria-label": string;
}

export function StageCheckbox({ checked, disabled, onChange, "aria-label": ariaLabel }: StageCheckboxProps) {
  return (
    <label className="relative inline-flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center has-[:disabled]:cursor-not-allowed">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        aria-label={ariaLabel}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-0 rounded-[4px] border shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ${
          checked
            ? "border-primary/90 bg-primary-container shadow-[0_0_0_1px_rgba(127,133,249,0.45),inset_0_1px_0_rgba(255,255,255,0.12)]"
            : "border-divider/30 bg-surface-container-high peer-hover:border-divider/50"
        } peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-primary/50 peer-disabled:border-divider/20 peer-disabled:bg-surface-container`}
      />
      <Icon
        name="check"
        aria-hidden
        fill
        className={`pointer-events-none relative z-[1] text-[14px] leading-none text-on-primary-container ${checked ? "opacity-100" : "opacity-0"}`}
      />
    </label>
  );
}
