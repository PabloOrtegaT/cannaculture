import { z } from "zod";
import {
  type AttributeDefinition,
  type AttributeValue,
  attributeDefinitionSchema,
  categoryTemplateKeySchema,
  type CategoryTemplateKey,
} from "./schemas";
import { categoryAttributeTemplates } from "../seed/category-attribute-fixtures";

const buildDefinitionValueSchema = (definition: AttributeDefinition): z.ZodType<AttributeValue | undefined> => {
  let schema: z.ZodTypeAny = z.string();

  switch (definition.type) {
    case "number": {
      let numberSchema = z.number();
      if (typeof definition.min === "number") {
        numberSchema = numberSchema.min(definition.min, `${definition.key} must be >= ${definition.min}`);
      }
      if (typeof definition.max === "number") {
        numberSchema = numberSchema.max(definition.max, `${definition.key} must be <= ${definition.max}`);
      }
      schema = numberSchema;
      break;
    }
    case "boolean":
      schema = z.boolean();
      break;
    case "enum": {
      const options = definition.options ?? [];
      schema = z
        .string()
        .refine((value) => options.includes(value), `${definition.key} must be one of: ${options.join(", ")}`);
      break;
    }
    case "string":
      schema = z.string().min(1);
      break;
    default:
      schema = z.string();
  }

  if (!definition.required) {
    return schema.optional() as z.ZodType<AttributeValue | undefined>;
  }

  return schema as z.ZodType<AttributeValue | undefined>;
};

export function buildAttributeValueSchema(definitions: readonly AttributeDefinition[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  definitions.forEach((definition) => {
    shape[definition.key] = buildDefinitionValueSchema(definition);
  });
  return z.object(shape).strict();
}

export function getCategoryAttributeDefinitions(templateKey: CategoryTemplateKey) {
  categoryTemplateKeySchema.parse(templateKey);
  return categoryAttributeTemplates[templateKey];
}

export function validateCategoryAttributeValues(
  templateKey: CategoryTemplateKey,
  values: Record<string, unknown>,
) {
  const definitions = getCategoryAttributeDefinitions(templateKey).map((definition) =>
    attributeDefinitionSchema.parse(definition),
  );
  const schema = buildAttributeValueSchema(definitions);
  return schema.safeParse(values);
}
