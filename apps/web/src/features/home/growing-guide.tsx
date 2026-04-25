import Link from "next/link";
import { Sprout, Sun, Droplets, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const STEPS = [
  {
    icon: Sprout,
    title: "1. Choose your seeds",
    description: "Start with beginner-friendly herbs or vegetables suited to your space and light.",
    href: "/catalog/plant-seeds",
  },
  {
    icon: Sun,
    title: "2. Set up lighting",
    description:
      "Match LED wattage and spectrum to your grow area — seedlings need less than flowering plants.",
    href: "/catalog/grow-lights",
  },
  {
    icon: Droplets,
    title: "3. Pick your substrate",
    description: "Coco coir, perlite blends, or potting mix — good drainage is key for healthy roots.",
    href: "/catalog/substrates",
  },
];

export function GrowingGuide() {
  return (
    <section className="space-y-5 rounded-xl border bg-gradient-to-br from-emerald-50/50 to-background dark:from-emerald-950/20 dark:to-background p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-primary">
            New to indoor growing?
          </p>
          <h2 className="text-xl font-bold tracking-tight">
            Start your garden in 3 steps
          </h2>
        </div>
        <Button variant="ghost" size="sm" asChild className="shrink-0">
          <Link href="/catalog">
            Shop all supplies <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        {STEPS.map((step) => {
          const Icon = step.icon;
          return (
            <Link
              key={step.title}
              href={step.href}
              className="group space-y-2 rounded-lg p-3 -m-3 transition-colors hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 transition-transform group-hover:scale-105">
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold">{step.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
