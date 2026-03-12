import type { AttributeDefinition, CategoryTemplateKey } from "../catalog/schemas";

export const categoryAttributeTemplates: Record<CategoryTemplateKey, AttributeDefinition[]> = {
  "prints-3d": [
    { key: "material", label: "Material", type: "enum", required: true, options: ["PLA", "ABS", "PETG", "TPU"] },
    { key: "layer_height_mm", label: "Layer Height (mm)", type: "number", required: true, min: 0.05, max: 0.4 },
    { key: "infill_percent", label: "Infill (%)", type: "number", required: true, min: 0, max: 100 },
    { key: "print_time_hours", label: "Estimated Print Time (hours)", type: "number", required: false, min: 0.1 },
  ],
  "pc-components": [
    { key: "socket", label: "CPU Socket", type: "string", required: true },
    { key: "wattage", label: "Power (W)", type: "number", required: false, min: 1 },
    { key: "form_factor", label: "Form Factor", type: "enum", required: false, options: ["ATX", "mATX", "ITX"] },
    {
      key: "chipset",
      label: "Chipset",
      type: "enum",
      required: false,
      options: ["B650", "X670", "Z790", "B760"],
    },
  ],
  "plant-seeds": [
    { key: "species", label: "Species", type: "string", required: true },
    {
      key: "sunlight",
      label: "Sunlight",
      type: "enum",
      required: true,
      options: ["full-sun", "partial-shade", "shade"],
    },
    { key: "germination_days", label: "Germination (days)", type: "number", required: true, min: 1 },
    {
      key: "seasonality",
      label: "Seasonality",
      type: "enum",
      required: false,
      options: ["spring", "summer", "fall", "winter", "year-round"],
    },
    { key: "is_heirloom", label: "Heirloom", type: "boolean", required: false },
  ],
};
