import React from "react";

interface FieldTableProps {
  fields: { name: string; description: string }[];
}

export function FieldTable({ fields }: FieldTableProps) {
  return (
    <div className="my-6 overflow-hidden rounded-xl border border-gray-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50">
            <th className="text-left font-semibold text-gray-700 px-4 py-3 border-b border-gray-200 w-1/3">
              Field
            </th>
            <th className="text-left font-semibold text-gray-700 px-4 py-3 border-b border-gray-200">
              Description
            </th>
          </tr>
        </thead>
        <tbody>
          {fields.map((field, i) => (
            <tr
              key={field.name}
              className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}
            >
              <td className="px-4 py-3 font-medium text-gray-800 align-top">
                {field.name}
              </td>
              <td className="px-4 py-3 text-gray-600">{field.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
