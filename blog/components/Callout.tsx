import React from "react";

interface CalloutProps {
  type?: "tip" | "warning" | "info";
  title?: string;
  children: React.ReactNode;
}

const config = {
  tip: {
    icon: "💡",
    bg: "bg-amber-50",
    border: "border-amber-200",
    titleColor: "text-amber-800",
    textColor: "text-amber-700",
  },
  warning: {
    icon: "⚠️",
    bg: "bg-red-50",
    border: "border-red-200",
    titleColor: "text-red-800",
    textColor: "text-red-700",
  },
  info: {
    icon: "📋",
    bg: "bg-blue-50",
    border: "border-blue-200",
    titleColor: "text-blue-800",
    textColor: "text-blue-700",
  },
};

export function Callout({ type = "tip", title, children }: CalloutProps) {
  const c = config[type];

  return (
    <div className={`${c.bg} ${c.border} border rounded-xl p-5 my-6`}>
      <div className="flex gap-3">
        <span className="text-xl leading-none mt-0.5">{c.icon}</span>
        <div className="flex-1">
          {title && (
            <p className={`font-semibold ${c.titleColor} mb-1`}>{title}</p>
          )}
          <div className={`${c.textColor} text-sm leading-relaxed`}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
