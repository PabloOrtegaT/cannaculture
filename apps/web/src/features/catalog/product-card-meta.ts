import type { AttributeValue, CategoryTemplateKey } from "@base-ecommerce/domain";

export type CardMeta = {
  badges: string[];
  lines: string[];
};

export function getProductCardMeta(
  templateKey: CategoryTemplateKey,
  attributeValues: Record<string, AttributeValue>,
): CardMeta {
  switch (templateKey) {
    case "seed-packet": {
      const badges: string[] = [];
      if (attributeValues.is_heirloom === true) {
        badges.push("Heirloom");
      }
      const lines = [
        typeof attributeValues.species === "string" ? attributeValues.species : undefined,
        typeof attributeValues.germination_days === "number"
          ? `Germinates in ${attributeValues.germination_days} days`
          : undefined,
        typeof attributeValues.sunlight === "string"
          ? `Sun: ${attributeValues.sunlight}`
          : undefined,
      ].filter((line): line is string => typeof line === "string");
      return { badges, lines };
    }
    case "grow-light": {
      const badges: string[] = [];
      if (attributeValues.dimmable === true) {
        badges.push("Dimmable");
      }
      const lines = [
        typeof attributeValues.wattage === "number" ? `${attributeValues.wattage}W` : undefined,
        typeof attributeValues.spectrum === "string" ? attributeValues.spectrum : undefined,
        typeof attributeValues.coverage_area_m2 === "number"
          ? `Covers ${attributeValues.coverage_area_m2}m²`
          : undefined,
      ].filter((line): line is string => typeof line === "string");
      return { badges, lines };
    }
    case "fertilizer": {
      const badges: string[] = [];
      if (attributeValues.organic === true) {
        badges.push("Organic");
      }
      const lines = [
        typeof attributeValues.npk_ratio === "string"
          ? `NPK ${attributeValues.npk_ratio}`
          : undefined,
        typeof attributeValues.form === "string" ? attributeValues.form : undefined,
        typeof attributeValues.volume_ml === "number"
          ? `${attributeValues.volume_ml}ml`
          : undefined,
      ].filter((line): line is string => typeof line === "string");
      return { badges, lines };
    }
    case "substrate": {
      const badges: string[] = [];
      if (attributeValues.sterilized === true) {
        badges.push("Sterilized");
      }
      const lines = [
        typeof attributeValues.composition === "string" ? attributeValues.composition : undefined,
        typeof attributeValues.volume_l === "number" ? `${attributeValues.volume_l}L` : undefined,
        typeof attributeValues.drainage === "string"
          ? `Drainage: ${attributeValues.drainage}`
          : undefined,
      ].filter((line): line is string => typeof line === "string");
      return { badges, lines };
    }
    case "pot-container": {
      const badges: string[] = [];
      if (attributeValues.has_drainage === true) {
        badges.push("Drainage hole");
      }
      const lines = [
        typeof attributeValues.material === "string" ? attributeValues.material : undefined,
        typeof attributeValues.diameter_cm === "number"
          ? `⌀${attributeValues.diameter_cm}cm`
          : undefined,
      ].filter((line): line is string => typeof line === "string");
      return { badges, lines };
    }
    case "tool-accessory": {
      const badges: string[] = [];
      if (attributeValues.ergonomic === true) {
        badges.push("Ergonomic");
      }
      const lines = [
        typeof attributeValues.tool_type === "string" ? attributeValues.tool_type : undefined,
        typeof attributeValues.material === "string" ? attributeValues.material : undefined,
        typeof attributeValues.length_cm === "number"
          ? `${attributeValues.length_cm}cm`
          : undefined,
      ].filter((line): line is string => typeof line === "string");
      return { badges, lines };
    }
    default: {
      return { badges: [], lines: [] };
    }
  }
}
