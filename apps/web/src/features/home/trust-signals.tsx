import { Truck, ShieldCheck, MessageCircle, Lock } from "lucide-react";

const SIGNALS = [
  {
    icon: Truck,
    title: "Fast shipping",
    description: "Nationwide delivery to your door",
  },
  {
    icon: ShieldCheck,
    title: "Quality guarantee",
    description: "Tested seeds and certified lights",
  },
  {
    icon: MessageCircle,
    title: "Grower support",
    description: "Expert advice for every stage",
  },
  {
    icon: Lock,
    title: "Secure checkout",
    description: "Encrypted payments you can trust",
  },
];

export function TrustSignals() {
  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {SIGNALS.map((signal) => {
        const Icon = signal.icon;
        return (
          <div key={signal.title} className="flex items-start gap-3 rounded-lg border bg-card p-4">
            <Icon className="h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-semibold">{signal.title}</p>
              <p className="text-xs text-muted-foreground">{signal.description}</p>
            </div>
          </div>
        );
      })}
    </section>
  );
}
