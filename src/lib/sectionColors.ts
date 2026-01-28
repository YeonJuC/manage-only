export const SECTION_COLORS = [
  "#2563EB", // blue
  "#22C55E", // green
  "#A855F7", // purple
  "#F97316", // orange
  "#EF4444", // red
  "#14B8A6", // teal
  "#EAB308", // yellow
  "#0EA5E9", // sky
  "#F43F5E", // rose
  "#64748B", // slate
];

export function colorFromSectionId(sectionId: string) {
  let hash = 0;
  for (let i = 0; i < sectionId.length; i++) hash = (hash * 31 + sectionId.charCodeAt(i)) >>> 0;
  return SECTION_COLORS[hash % SECTION_COLORS.length];
}
