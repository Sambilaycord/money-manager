"use client";

import { readableTextColor, type ColorSwatch } from "@money-manager/shared";
import { CheckIcon } from "@/components/icons";

export interface SwatchGroup {
  label: string;
  swatches: readonly ColorSwatch[];
}

interface ColorSwatchPickerProps {
  name: string;
  legend: string;
  groups: readonly SwatchGroup[];
  value: string;
  onChange: (hex: string) => void;
}

/** Native radios underneath, so arrow keys and screen readers work for free. */
export function ColorSwatchPicker({ name, legend, groups, value, onChange }: ColorSwatchPickerProps) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1.5 text-sm font-medium">{legend}</legend>
      {groups.map((group) => (
        <div key={group.label} className="flex flex-col gap-1.5">
          {groups.length > 1 && <p className="text-xs text-muted">{group.label}</p>}
          <div className="flex flex-wrap gap-2">
            {group.swatches.map((swatch) => (
              <label
                key={`${group.label}-${swatch.hex}`}
                title={swatch.label}
                // Painted with the swatch's own colour: these are data, not theme.
                style={{ backgroundColor: swatch.hex, color: readableTextColor(swatch.hex) }}
                className="flex size-8 cursor-pointer items-center justify-center rounded-full ring-offset-2 ring-offset-surface has-checked:ring-2 has-checked:ring-foreground has-focus-visible:ring-2 has-focus-visible:ring-primary"
              >
                <input
                  type="radio"
                  name={name}
                  value={swatch.hex}
                  checked={value === swatch.hex}
                  onChange={() => onChange(swatch.hex)}
                  aria-label={swatch.label}
                  className="sr-only"
                />
                {value === swatch.hex && <CheckIcon width={16} height={16} />}
              </label>
            ))}
          </div>
        </div>
      ))}
    </fieldset>
  );
}
