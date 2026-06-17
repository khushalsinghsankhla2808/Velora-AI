// PATH: frontend/src/components/PreviewToolbar.jsx
import React from "react";
import { Monitor, Tablet, Smartphone } from "lucide-react";

/**
 * PreviewToolbar Component
 * Renders a segmented button group to switch the responsive preview width between Desktop, Tablet, and Mobile.
 *
 * @param {Object} props
 * @param {string} props.current - The active preview mode ('desktop', 'tablet', or 'mobile')
 * @param {function} props.onChange - Callback triggered on switching preview mode
 */
const PreviewToolbar = ({ current, onChange }) => {
  const options = [
    { value: "desktop", label: "Desktop", icon: Monitor },
    { value: "tablet", label: "Tablet", icon: Tablet },
    { value: "mobile", label: "Mobile", icon: Smartphone },
  ];

  return (
    <div 
      className="flex items-center bg-zinc-950 border border-white/10 rounded-xl p-0.5 shadow-md"
      id="preview-viewport-toggle"
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        const isActive = current === opt.value;
        return (
          <button
            key={opt.value}
            id={`preview-toggle-${opt.value}`}
            onClick={() => onChange(opt.value)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition duration-200 cursor-pointer ${
              isActive
                ? "bg-white/10 text-white border border-white/5 shadow-xs"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent"
            }`}
            title={`Switch to ${opt.label} View`}
          >
            <Icon size={12} />
            <span className="hidden md:inline">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default PreviewToolbar;
