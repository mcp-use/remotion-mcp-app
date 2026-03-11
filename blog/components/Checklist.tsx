import React from "react";

interface ChecklistProps {
  items: { text: React.ReactNode; done?: boolean }[];
}

export function Checklist({ items }: ChecklistProps) {
  return (
    <ul className="my-4 space-y-3">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 text-xs">
            ✓
          </span>
          <span className="text-gray-700 leading-relaxed">{item.text}</span>
        </li>
      ))}
    </ul>
  );
}
