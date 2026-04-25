"use client";

import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@cannaculture/ui";
import { useState } from "react";
import { CheckCircle2, XCircle, Ban, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

type MockCheckoutClientProps = {
  orderId: string;
  provider: "card" | "mercadopago";
  providerSessionId: string;
};

function resolveMockProviderId(provider: MockCheckoutClientProps["provider"]) {
  if (provider === "mercadopago") return "mock-mercadopago";
  return "mock-card";
}

const providerLabels: Record<string, string> = {
  card: "Mock Card",
  mercadopago: "Mock Mercado Pago",
};

export function MockCheckoutClient({ orderId, provider, providerSessionId }: MockCheckoutClientProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runOutcome = async (outcome: "succeeded" | "failed" | "cancelled") => {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/payments/mock/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          providerSessionId,
          providerId: resolveMockProviderId(provider),
          outcome,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(payload?.error ?? "Could not complete mock payment.");
        return;
      }

      const nextPath = outcome === "succeeded" ? "/checkout/success" : "/checkout/cancel";
      const url = new URL(nextPath, window.location.origin);
      url.searchParams.set("order", orderId);
      window.location.assign(url.toString());
    } catch {
      setError("Could not complete mock payment.");
    } finally {
      setPending(false);
    }
  };

  return (
    <Card className="max-w-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Mock Payment Simulator</CardTitle>
          <Badge variant="warning">Dev only</Badge>
        </div>
        <div className="space-y-1 text-xs text-muted-foreground pt-1">
          <p>Provider: <span className="font-medium">{providerLabels[provider]}</span></p>
          <p className="font-mono">{providerSessionId}</p>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="pt-4 space-y-3">
        <p className="text-sm text-muted-foreground">
          Simulate a provider webhook response to test the order flow.
        </p>
        <div className="grid gap-2">
          <Button
            className="w-full"
            disabled={pending}
            onClick={() => runOutcome("succeeded")}
          >
            <CheckCircle2 className="h-4 w-4" />
            Simulate payment success
          </Button>
          <Button
            variant="outline"
            className="w-full"
            disabled={pending}
            onClick={() => runOutcome("failed")}
          >
            <XCircle className="h-4 w-4" />
            Simulate payment failure
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            disabled={pending}
            onClick={() => runOutcome("cancelled")}
          >
            <Ban className="h-4 w-4" />
            Simulate cancellation
          </Button>
        </div>
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
