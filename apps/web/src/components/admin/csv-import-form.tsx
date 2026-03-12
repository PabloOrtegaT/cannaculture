"use client";

import * as React from "react";
import type { CsvImportResult } from "@/features/admin/types";
import { importCatalogCsvAction } from "@/app/(admin)/admin/actions";
import { CsvErrorsTable } from "./tables";

type CsvImportFormProps = {
  defaultCategorySlug: string;
};

export function CsvImportForm({ defaultCategorySlug }: CsvImportFormProps) {
  const [csvText, setCsvText] = React.useState(
    `name,slug,baseSku,categorySlug,status,currency,priceCents,stockOnHand
Demo Product,demo-product,DEMO_PRODUCT,${defaultCategorySlug},active,MXN,19900,12`,
  );
  const [result, setResult] = React.useState<CsvImportResult | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const handleSubmit = React.useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setErrorMessage(null);

      startTransition(async () => {
        try {
          const nextResult = await importCatalogCsvAction(csvText);
          setResult(nextResult);
        } catch (error) {
          const message = error instanceof Error ? error.message : "CSV import failed.";
          setErrorMessage(message);
        }
      });
    },
    [csvText],
  );

  return (
    <section className="space-y-4 rounded-lg border bg-card p-6 text-card-foreground">
      <div>
        <h2 className="text-lg font-semibold">Bulk CSV import</h2>
        <p className="text-sm text-muted-foreground">
          Upload catalog rows with row-level validation and partial-success support.
        </p>
      </div>

      <form className="space-y-3" onSubmit={handleSubmit}>
        <label className="block text-sm font-medium" htmlFor="catalog-csv-input">
          CSV payload
        </label>
        <textarea
          id="catalog-csv-input"
          name="csvText"
          value={csvText}
          onChange={(event) => setCsvText(event.target.value)}
          className="min-h-44 w-full rounded-md border bg-background px-3 py-2 font-mono text-xs"
        />
        <button
          type="submit"
          className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          disabled={isPending}
        >
          {isPending ? "Importing..." : "Run import"}
        </button>
      </form>

      {errorMessage ? (
        <p className="rounded-md border border-red-400/50 bg-red-500/10 px-3 py-2 text-sm text-red-700">{errorMessage}</p>
      ) : null}

      {result ? (
        <div className="space-y-3">
          <div className="rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">
            Imported products: <span className="font-semibold text-foreground">{result.importedProducts}</span> | Imported
            variants: <span className="font-semibold text-foreground">{result.importedVariants}</span> | Row errors:{" "}
            <span className="font-semibold text-foreground">{result.errors.length}</span>
          </div>
          <CsvErrorsTable rows={result.errors} />
        </div>
      ) : null}
    </section>
  );
}
