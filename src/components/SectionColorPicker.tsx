import { SECTION_COLORS } from "../lib/sectionColors";
import "./SectionColorPicker.css";

export default function SectionColorPicker({
  value,
  onChange,
}: {
  value?: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="scp">
      {SECTION_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          className={`scpDot ${value?.toLowerCase() === c.toLowerCase() ? "active" : ""}`}
          style={{ background: c }}
          onClick={() => onChange(c)}
          aria-label={`색상 ${c}`}
          title={c}
        />
      ))}
    </div>
  );
}
