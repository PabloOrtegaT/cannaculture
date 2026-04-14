import type { AttributeValue, CategoryTemplateKey } from "@base-ecommerce/domain";
import { getCategoryAttributeDefinitions } from "@base-ecommerce/domain";

export type ProductDetailMeta = {
  badges: string[];
  heroLines: string[];
  specs: { key: string; label: string; value: string }[];
  tips: string[];
};

function formatAttributeValue(value: AttributeValue): string | undefined {
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (typeof value === "number") {
    return String(value);
  }
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  return undefined;
}

function formatEnumValue(value: string): string {
  return value
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function buildSpecs(
  templateKey: CategoryTemplateKey,
  attributeValues: Record<string, AttributeValue>,
): { key: string; label: string; value: string }[] {
  const definitions = getCategoryAttributeDefinitions(templateKey);
  return definitions
    .map((def) => {
      const raw = attributeValues[def.key];
      if (raw === undefined || raw === null || raw === "") {
        return null;
      }
      const formatted = formatAttributeValue(raw);
      if (!formatted) {
        return null;
      }
      const displayValue =
        def.type === "enum" && typeof raw === "string" ? formatEnumValue(raw) : formatted;
      return { key: def.key, label: def.label, value: displayValue };
    })
    .filter((s): s is { key: string; label: string; value: string } => s !== null);
}

export function getProductDetailMeta(
  templateKey: CategoryTemplateKey,
  attributeValues: Record<string, AttributeValue>,
): ProductDetailMeta {
  let specs: { key: string; label: string; value: string }[] = [];
  try {
    specs = buildSpecs(templateKey, attributeValues);
  } catch {
    return { badges: [], heroLines: [], specs, tips: [] };
  }

  switch (templateKey) {
    case "seed-packet": {
      const badges: string[] = [];
      if (attributeValues.is_heirloom === true) badges.push("Heirloom variety");
      if (attributeValues.seasonality === "year-round") badges.push("Year-round growing");
      const heroLines = [
        typeof attributeValues.species === "string" ? attributeValues.species : undefined,
        typeof attributeValues.germination_days === "number"
          ? `Germinates in ${attributeValues.germination_days} days`
          : undefined,
        typeof attributeValues.sunlight === "string"
          ? `Sunlight: ${formatEnumValue(attributeValues.sunlight)}`
          : undefined,
      ].filter((line): line is string => typeof line === "string");
      const tips: string[] = [
        typeof attributeValues.seasonality === "string"
          ? `Best sown in ${formatEnumValue(attributeValues.seasonality)}.`
          : undefined,
        "Keep soil evenly moist until seedlings emerge.",
      ].filter((t): t is string => typeof t === "string");
      return { badges, heroLines, specs, tips };
    }
    case "grow-light": {
      const badges: string[] = [];
      if (attributeValues.dimmable === true) badges.push("Dimmable");
      const heroLines = [
        typeof attributeValues.wattage === "number" ? `${attributeValues.wattage}W` : undefined,
        typeof attributeValues.spectrum === "string"
          ? `Spectrum: ${formatEnumValue(attributeValues.spectrum)}`
          : undefined,
        typeof attributeValues.coverage_area_m2 === "number"
          ? `Covers ${attributeValues.coverage_area_m2} m²`
          : undefined,
      ].filter((line): line is string => typeof line === "string");
      const tips: string[] = [
        "Hang at the manufacturer-recommended height for your plant stage.",
        attributeValues.dimmable === true
          ? "Dim during seedling stage to avoid light stress."
          : undefined,
      ].filter((t): t is string => typeof t === "string");
      return { badges, heroLines, specs, tips };
    }
    case "fertilizer": {
      const badges: string[] = [];
      if (attributeValues.organic === true) badges.push("Organic");
      const heroLines = [
        typeof attributeValues.npk_ratio === "string"
          ? `NPK ${attributeValues.npk_ratio}`
          : undefined,
        typeof attributeValues.form === "string"
          ? `Form: ${formatEnumValue(attributeValues.form)}`
          : undefined,
        typeof attributeValues.volume_ml === "number"
          ? `${attributeValues.volume_ml} mL`
          : undefined,
      ].filter((line): line is string => typeof line === "string");
      const tips: string[] = [
        typeof attributeValues.form === "string" && attributeValues.form === "liquid"
          ? "Dilute to the recommended strength before applying to roots or foliage."
          : undefined,
        typeof attributeValues.frequency_days === "number"
          ? `Feed every ${attributeValues.frequency_days} days for best results.`
          : undefined,
      ].filter((t): t is string => typeof t === "string");
      if (tips.length === 0) {
        tips.push("Store in a cool, dry place away from direct sunlight.");
      }
      return { badges, heroLines, specs, tips };
    }
    case "substrate": {
      const badges: string[] = [];
      if (attributeValues.sterilized === true) badges.push("Sterilized");
      const heroLines = [
        typeof attributeValues.composition === "string"
          ? `Composition: ${formatEnumValue(attributeValues.composition)}`
          : undefined,
        typeof attributeValues.volume_l === "number" ? `${attributeValues.volume_l} L` : undefined,
        typeof attributeValues.drainage === "string"
          ? `Drainage: ${formatEnumValue(attributeValues.drainage)}`
          : undefined,
      ].filter((line): line is string => typeof line === "string");
      const tips: string[] = [
        "Pre-moisten substrate before filling pots or trays.",
        typeof attributeValues.ph_range === "string"
          ? `Target pH range: ${attributeValues.ph_range}.`
          : undefined,
      ].filter((t): t is string => typeof t === "string");
      return { badges, heroLines, specs, tips };
    }
    case "pot-container": {
      const badges: string[] = [];
      if (attributeValues.has_drainage === true) badges.push("Drainage holes");
      if (attributeValues.reusable === true) badges.push("Reusable");
      const heroLines = [
        typeof attributeValues.material === "string"
          ? `Material: ${formatEnumValue(attributeValues.material)}`
          : undefined,
        typeof attributeValues.diameter_cm === "number"
          ? `Diameter: ${attributeValues.diameter_cm} cm`
          : undefined,
      ].filter((line): line is string => typeof line === "string");
      const tips: string[] = [
        "Choose a pot 2–5 cm larger than the current root ball for transplants.",
        attributeValues.has_drainage === false
          ? "Use a drainage layer of pebbles if the pot has no holes."
          : undefined,
      ].filter((t): t is string => typeof t === "string");
      if (tips.length === 0) {
        tips.push("Clean between uses to reduce disease carryover.");
      }
      return { badges, heroLines, specs, tips };
    }
    case "tool-accessory": {
      const badges: string[] = [];
      if (attributeValues.ergonomic === true) badges.push("Ergonomic grip");
      const heroLines = [
        typeof attributeValues.tool_type === "string"
          ? `Type: ${formatEnumValue(attributeValues.tool_type)}`
          : undefined,
        typeof attributeValues.material === "string"
          ? `Material: ${formatEnumValue(attributeValues.material)}`
          : undefined,
        typeof attributeValues.length_cm === "number"
          ? `Length: ${attributeValues.length_cm} cm`
          : undefined,
      ].filter((line): line is string => typeof line === "string");
      const tips: string[] = [
        "Clean and dry tools after each use to prevent rust and disease spread.",
        typeof attributeValues.warranty_months === "number"
          ? `Warranty: ${attributeValues.warranty_months} months.`
          : undefined,
      ].filter((t): t is string => typeof t === "string");
      return { badges, heroLines, specs, tips };
    }
    default: {
      return { badges: [], heroLines: [], specs, tips: [] };
    }
  }
}
