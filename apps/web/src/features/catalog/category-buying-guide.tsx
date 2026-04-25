import { BookOpen } from "lucide-react";

const GUIDES: Record<string, { title: string; subtitle: string; tips: string[] }> = {
  "plant-seeds": {
    title: "Seed selection guide",
    subtitle: "Quick tips to pick the right seeds for your indoor setup.",
    tips: [
      "Start with beginner-friendly herbs like basil or cilantro — they germinate fast and forgive mistakes.",
      "Check germination days and sunlight needs before buying. These numbers tell you if a variety suits your space.",
      "Heirloom varieties can be replanted from saved seeds, giving you harvests season after season.",
    ],
  },
  "grow-lights": {
    title: "Grow light buying guide",
    subtitle: "How to match lighting to your plants and grow area.",
    tips: [
      "Match wattage to your grow space size — underpowered lights lead to leggy, weak plants.",
      "Seedlings need lower intensity than flowering plants. Dimmable panels give you flexibility across stages.",
      "LED panels run cooler and use less energy than HID, making them ideal for closets and small rooms.",
    ],
  },
  fertilizers: {
    title: "Nutrient buying guide",
    subtitle: "Feed your plants right from seedling to harvest.",
    tips: [
      "Look for NPK ratios that match your plant's growth stage — more nitrogen for veg, more phosphorus for bloom.",
      "Liquid nutrients are easier to dial in, especially for hydroponic and coco coir setups.",
      "Always follow the recommended dilution. Overfeeding causes nutrient burn and can kill young plants.",
    ],
  },
  substrates: {
    title: "Substrate selection guide",
    subtitle: "The right growing medium makes all the difference.",
    tips: [
      "Coco coir holds moisture well while perlite improves drainage — many growers mix both.",
      "Blending substrates gives you the best balance of water retention and root aeration.",
      "Sterilized media significantly reduces the risk of pests, mold, and root disease.",
    ],
  },
  "pots-and-containers": {
    title: "Pot and container guide",
    subtitle: "Choose containers that support healthy root growth.",
    tips: [
      "Always ensure pots have drainage holes — standing water is the top cause of root rot.",
      "Fabric grow bags improve root health through air-pruning and prevent root-bound plants.",
      "Match pot size to the mature size of the plant. Too-small pots restrict growth; too-large pots hold excess moisture.",
    ],
  },
  "tools-and-accessories": {
    title: "Grower tool guide",
    subtitle: "Essential tools for maintaining a healthy indoor garden.",
    tips: [
      "Keep pruning shears clean between plants to prevent spreading disease.",
      "A pH meter helps you catch nutrient lockout early — a common issue in indoor grows.",
      "Invest in ergonomic tools if you work with your garden regularly. Your hands will thank you.",
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
    <div className="rounded-lg border bg-gradient-to-br from-amber-50/40 to-card dark:from-amber-950/10 dark:to-card p-5 text-card-foreground">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          <BookOpen className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold">{guide.title}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{guide.subtitle}</p>
        </div>
      </div>
      <ul className="space-y-2 pl-0 text-sm text-muted-foreground">
        {guide.tips.map((tip, idx) => (
          <li key={`tip-${idx}`} className="flex items-start gap-2">
            <span className="text-amber-500 mt-1.5 shrink-0" aria-hidden>&#9679;</span>
            <span className="leading-relaxed">{tip}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
