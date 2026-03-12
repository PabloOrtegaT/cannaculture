import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "@base-ecommerce/ui";

describe("Button", () => {
  it("renders label and default styling", () => {
    render(<Button>Save changes</Button>);

    const button = screen.getByRole("button", { name: "Save changes" });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass("bg-primary");
  });
});
