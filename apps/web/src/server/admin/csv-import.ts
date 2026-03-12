import { currencySchema, productStatusSchema } from "@base-ecommerce/domain";
import { z } from "zod";
import type { CsvImportRowError } from "@/features/admin/types";

export const productCsvHeaders = [
  "name",
  "slug",
  "baseSku",
  "categorySlug",
  "status",
  "currency",
  "priceCents",
  "stockOnHand",
] as const;

export type ProductCsvHeader = (typeof productCsvHeaders)[number];

export type ParsedProductCsvRow = {
  name: string;
  slug: string;
  baseSku: string;
  categorySlug: string;
  status: z.infer<typeof productStatusSchema>;
  currency: z.infer<typeof currencySchema>;
  priceCents: number;
  stockOnHand: number;
};

export type ProductCsvParseResult = {
  rows: ParsedProductCsvRow[];
  errors: CsvImportRowError[];
};

const productCsvRowSchema = z.object({
  name: z.string().min(3).max(120),
  slug: z
    .string()
    .min(3)
    .max(160)
    .regex(/^[a-z0-9-]+$/),
  baseSku: z.string().min(3).max(64),
  categorySlug: z
    .string()
    .min(3)
    .max(120)
    .regex(/^[a-z0-9-]+$/),
  status: z.preprocess(
    (value) => {
      if (typeof value !== "string" || value.trim().length === 0) {
        return "active";
      }
      return value.trim().toLowerCase();
    },
    productStatusSchema,
  ),
  currency: z.preprocess(
    (value) => {
      if (typeof value !== "string" || value.trim().length === 0) {
        return "MXN";
      }
      return value.trim().toUpperCase();
    },
    currencySchema,
  ),
  priceCents: z.coerce.number().int().nonnegative(),
  stockOnHand: z.coerce.number().int().nonnegative(),
});

function splitCsvLine(line: string) {
  return line.split(",").map((entry) => entry.trim());
}

function makeHeaderError(reason: string): ProductCsvParseResult {
  return {
    rows: [],
    errors: [
      {
        rowNumber: 1,
        reason,
        rowValues: null,
      },
    ],
  };
}

function toRowValues(headers: readonly ProductCsvHeader[], values: string[]) {
  return headers.reduce<Record<string, string>>((accumulator, header, index) => {
    accumulator[header] = values[index] ?? "";
    return accumulator;
  }, {});
}

export function parseProductCsv(csvText: string): ProductCsvParseResult {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return makeHeaderError("CSV must include header row and at least one data row.");
  }

  const headerValues = splitCsvLine(lines[0] ?? "");
  const missingHeaders = productCsvHeaders.filter((header) => !headerValues.includes(header));
  const unexpectedHeaders = headerValues.filter(
    (header) => !productCsvHeaders.includes(header as ProductCsvHeader),
  );

  if (missingHeaders.length > 0 || unexpectedHeaders.length > 0 || headerValues.length !== productCsvHeaders.length) {
    return makeHeaderError(
      `Invalid headers. Expected: ${productCsvHeaders.join(", ")}. Missing: ${
        missingHeaders.join(", ") || "none"
      }. Unexpected: ${unexpectedHeaders.join(", ") || "none"}.`,
    );
  }

  const rows: ParsedProductCsvRow[] = [];
  const errors: CsvImportRowError[] = [];

  lines.slice(1).forEach((line, lineIndex) => {
    const rowNumber = lineIndex + 2;
    const values = splitCsvLine(line);

    if (values.length !== productCsvHeaders.length) {
      errors.push({
        rowNumber,
        reason: `Expected ${productCsvHeaders.length} columns but got ${values.length}.`,
        rowValues: null,
      });
      return;
    }

    const rowValues = toRowValues(productCsvHeaders, values);
    const parsed = productCsvRowSchema.safeParse(rowValues);

    if (!parsed.success) {
      errors.push({
        rowNumber,
        reason: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "),
        rowValues,
      });
      return;
    }

    rows.push(parsed.data);
  });

  return {
    rows,
    errors,
  };
}
