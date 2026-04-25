import { Input, Label } from "@cannaculture/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AttributeDefinition, AttributeValue } from "@cannaculture/domain";

export function VariantAttributeFields({
  definitions,
  defaultValues,
}: {
  definitions: AttributeDefinition[];
  defaultValues: Record<string, AttributeValue>;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {definitions.map((definition) => {
        const name = `attr:${definition.key}`;
        const defaultValue = defaultValues[definition.key];
        const id = `attr-${definition.key}`;

        if (definition.type === "boolean") {
          return (
            <label key={definition.key} className="flex items-center gap-2 text-sm" htmlFor={id}>
              <input
                id={id}
                type="checkbox"
                name={name}
                defaultChecked={typeof defaultValue === "boolean" ? defaultValue : false}
              />
              {definition.label}
              {definition.required && <span className="text-red-500">*</span>}
            </label>
          );
        }

        if (definition.type === "enum" && definition.options && definition.options.length > 0) {
          return (
            <div key={definition.key} className="space-y-2">
              <Label htmlFor={id}>
                {definition.label}
                {definition.required && <span className="text-red-500">*</span>}
              </Label>
              <Select
                name={name}
                {...(typeof defaultValue === "string" ? { defaultValue } : {})}
                required={definition.required}
              >
                <SelectTrigger id={id}>
                  <SelectValue placeholder={`Select ${definition.label.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                  {definition.options.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        }

        if (definition.type === "number") {
          return (
            <div key={definition.key} className="space-y-2">
              <Label htmlFor={id}>
                {definition.label}
                {definition.required && <span className="text-red-500">*</span>}
              </Label>
              <Input
                id={id}
                type="number"
                name={name}
                defaultValue={typeof defaultValue === "number" ? defaultValue : undefined}
                min={typeof definition.min === "number" ? definition.min : undefined}
                max={typeof definition.max === "number" ? definition.max : undefined}
                required={definition.required}
              />
            </div>
          );
        }

        return (
          <div key={definition.key} className="space-y-2">
            <Label htmlFor={id}>
              {definition.label}
              {definition.required && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id={id}
              type="text"
              name={name}
              defaultValue={typeof defaultValue === "string" ? defaultValue : undefined}
              required={definition.required}
            />
          </div>
        );
      })}
    </div>
  );
}
