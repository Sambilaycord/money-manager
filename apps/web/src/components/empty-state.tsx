import type { ComponentType, ReactNode, SVGProps } from "react";
import { toneClassName, type PastelTone } from "@/components/tone";

interface EmptyStateProps {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  description: string;
  action?: ReactNode;
  tone?: PastelTone;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  tone = "cloud",
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center px-4 py-12 text-center">
      <span className={`flex size-14 items-center justify-center rounded-2xl ${toneClassName[tone]}`}>
        <Icon width={24} height={24} />
      </span>
      <h3 className="mt-5 text-base font-semibold">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-pretty text-muted">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
