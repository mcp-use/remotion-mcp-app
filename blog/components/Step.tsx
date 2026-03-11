import React from "react";

interface StepProps {
  number: number;
  title: string;
  children: React.ReactNode;
  last?: boolean;
}

export function Step({ number, title, children, last = false }: StepProps) {
  return (
    <div className="relative flex gap-6 pb-12">
      {/* Vertical connector line */}
      {!last && (
        <div className="absolute left-5 top-12 bottom-0 w-px bg-gradient-to-b from-indigo-300 to-transparent" />
      )}

      {/* Number badge */}
      <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-sm shadow-lg shadow-indigo-200">
        {number}
      </div>

      {/* Content */}
      <div className="flex-1 pt-1">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{title}</h2>
        <div className="space-y-4 text-gray-700 leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

interface SubStepProps {
  title: string;
  children: React.ReactNode;
}

export function SubStep({ title, children }: SubStepProps) {
  return (
    <div className="mt-6 pl-4 border-l-2 border-indigo-100">
      <h3 className="text-lg font-semibold text-gray-800 mb-3">{title}</h3>
      <div className="space-y-3 text-gray-700">{children}</div>
    </div>
  );
}
