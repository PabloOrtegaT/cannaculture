import { Truck, ShieldCheck, Headset, Sprout } from "lucide-react";

const SIGNALS = [
  {
    icon: Truck,
    title: "Fast, careful dispatch",
    description: "Seeds and supplies packed with care so your grow can get moving quickly.",
  },
  {
    icon: ShieldCheck,
    title: "Indoor-grow focused",
    description: "A focused catalog of seeds, lights, substrates, and tools chosen for indoor setups.",
  },
  {
    icon: Headset,
    title: "Grower guidance",
    description: "Practical buying help for seeds, lighting, substrates, and everyday cultivation needs.",
  },
  {
    icon: Sprout,
    title: "Built for small spaces",
    description: "Designed around indoor gardens, closets, shelves, and compact grow rooms.",
  },
];

export function TrustSignals() {
  return (
    <section className="rounded-xl border bg-gradient-to-br from-card to-muted/30 p-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-4">
        Why growers trust us
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SIGNALS.map((signal) => {
          const Icon = signal.icon;
          return (
            <div key={signal.title} className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold leading-tight">{signal.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                  {signal.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
