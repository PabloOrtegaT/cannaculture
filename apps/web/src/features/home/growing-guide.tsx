import { Sprout, Sun, Droplets } from "lucide-react";

const STEPS = [
  {
    icon: Sprout,
    title: "1. Choose seeds",
    description: "Pick easy herbs or vegetables matched to your space.",
  },
  {
    icon: Sun,
    title: "2. Add light",
    description: "Match LED wattage to your grow area and plant stage.",
  },
  {
    icon: Droplets,
    title: "3. Select substrate",
    description: "Use coco coir or potting mix with good drainage.",
  },
];

export function GrowingGuide() {
  return (
    <section className="space-y-4 rounded-xl border bg-gradient-to-br from-emerald-50/50 to-background p-6">
      <div>
        <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-primary">
          New to indoor growing?
        </p>
        <h2 className="text-xl font-bold tracking-tight">Start your garden in 3 steps</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {STEPS.map((step) => {
          const Icon = step.icon;
          return (
            <div key={step.title} className="space-y-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold">{step.title}</p>
              <p className="text-xs text-muted-foreground">{step.description}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
