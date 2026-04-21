import { Upload, Camera, FileSearch, BarChart2 } from "lucide-react";
import { LucideIcon } from "lucide-react";

interface ActionItem {
  id: string;
  icon: LucideIcon;
  label: string;
  description: string;
  iconClass: string;
  iconBg: string;
  cardBg: string;
  cardHover: string;
}

const ACTIONS: ActionItem[] = [
  {
    id:          "quick-action-upload",
    icon:        Upload,
    label:       "Upload Receipt",
    description: "Drag & drop or browse files",
    iconClass:   "text-primary",
    iconBg:      "bg-primary/10",
    cardBg:      "bg-primary/5",
    cardHover:   "hover:bg-primary/10",
  },
  {
    id:          "quick-action-scan",
    icon:        Camera,
    label:       "Scan Receipt",
    description: "Use AI-powered scanner",
    iconClass:   "text-tertiary",
    iconBg:      "bg-tertiary/10",
    cardBg:      "bg-tertiary/5",
    cardHover:   "hover:bg-tertiary/10",
  },
  {
    id:          "quick-action-policy",
    icon:        FileSearch,
    label:       "Policy Check",
    description: "Verify expense eligibility",
    iconClass:   "text-secondary",
    iconBg:      "bg-secondary/10",
    cardBg:      "bg-secondary/5",
    cardHover:   "hover:bg-secondary/10",
  },
  {
    id:          "quick-action-report",
    icon:        BarChart2,
    label:       "Spending Report",
    description: "View monthly breakdown",
    iconClass:   "text-on-surface-variant",
    iconBg:      "bg-surface-container-high",
    cardBg:      "bg-surface-container-low",
    cardHover:   "hover:bg-surface-container",
  },
];

export default function QuickActions() {
  return (
    <section aria-labelledby="quick-actions-heading">
      <h3
        id="quick-actions-heading"
        className="font-headline text-lg font-bold text-on-surface mb-4"
      >
        Quick Actions
      </h3>

      {/*
       * Grid explanation:
       *   - Mobile: 2-column grid (grid-cols-2) — compact, thumb-friendly
       *   - Desktop (md+): 4-column grid — shows all actions in one row
       * Each card uses flex-col to stack icon → label → desc vertically.
       */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {ACTIONS.map(
          ({ id, icon: Icon, label, description, iconClass, iconBg, cardBg, cardHover }) => (
            <button
              key={id}
              id={id}
              className={`
                flex flex-col items-start gap-3 p-4 rounded-2xl
                ${cardBg} ${cardHover}
                border border-outline-variant/5
                active:scale-[0.97] transition-all duration-200
                text-left group
              `}
            >
              {/* Icon */}
              <div
                className={`p-2.5 rounded-xl ${iconBg} shadow-sm ${iconClass} group-hover:scale-110 transition-transform duration-200`}
              >
                <Icon className="w-5 h-5" strokeWidth={1.75} />
              </div>

              {/* Label + description */}
              <div>
                <p className={`font-body font-semibold text-sm ${iconClass} mb-0.5`}>
                  {label}
                </p>
                <p className="font-body text-xs text-on-surface-variant leading-relaxed">
                  {description}
                </p>
              </div>
            </button>
          )
        )}
      </div>
    </section>
  );
}
