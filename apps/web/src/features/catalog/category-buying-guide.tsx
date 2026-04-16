import { Lightbulb } from "lucide-react";

const GUIDES: Record<string, { title: string; tips: string[] }> = {
  "plant-seeds": {
    title: "Seed buying guide",
    tips: [
      "Start with easy herbs like basil or cilantro.",
      "Check germination days and sunlight needs on the packet.",
      "Heirloom varieties can be replanted from saved seeds.",
    ],
  },
  "grow-lights": {
    title: "Grow light guide",
    tips: [
      "Match wattage to your grow space size.",
      "Seedlings need less intensity than flowering plants.",
      "LED panels run cooler and use less energy than HID.",
    ],
  },
  fertilizers: {
    title: "Fertilizer guide",
    tips: [
      "Look for NPK ratios that match your plant's growth stage.",
      "Liquid nutrients are easy to dial in with hydroponics.",
      "Always follow the recommended dilution to avoid burn.",
    ],
  },
  substrates: {
    title: "Substrate guide",
    tips: [
      "Coco coir holds moisture well; perlite improves drainage.",
      "Mix substrates for the best balance of water and air.",
      "Sterilized media reduces pest and disease risk.",
    ],
  },
  "pots-and-containers": {
    title: "Pot buying guide",
    tips: [
      "Ensure pots have drainage holes to prevent root rot.",
      "Fabric grow bags improve root health through air-pruning.",
      "Match pot size to the mature size of the plant.",
    ],
  },
  "tools-and-accessories": {
    title: "Tool guide",
    tips: [
      "Keep pruning shears clean to prevent disease spread.",
      "A pH meter helps you catch nutrient lockout early.",
      "Invest in ergonomic tools if you tend a large garden.",
    ],
  },
};

export function getCategoryBuyingGuide(categorySlug: string) {
  return GUIDES[categorySlug] ?? null;
}

export function CategoryBuyingGuide({ categorySlug }: { categorySlug: string }) {
  const guide = getCategoryBuyingGuide(categorySlug);
  if (!guide) return null;

  return (
    <div className="rounded-lg border bg-card p-4 text-card-foreground">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-100 text-amber-700">
          <Lightbulb className="h-4 w-4" />
        </div>
        <h2 className="text-sm font-semibold">{guide.title}</h2>
      </div>
      <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
        {guide.tips.map((tip, idx) => (
          <li key={`tip-${idx}`}>{tip}</li>
        ))}
      </ul>
    </div>
  );
}
