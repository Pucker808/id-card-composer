import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

const FieldSchema = z.object({
  label: z.string().min(1).describe("Field label, e.g. 'Name'"),
  value: z.string().describe("Field value to display on the card"),
  side: z.enum(["front", "back"]).default("front").describe("Which side of the card the field appears on"),
});

export default defineTool({
  name: "build_card_payload",
  title: "Build ID card payload",
  description:
    "Assemble a JSON payload matching the IQRA ID Card Generator's field shape from a name, position, card number, and additional fields. Useful for previewing what data would be composed into a card.",
  inputSchema: {
    cardNo: z.string().trim().min(1).describe("Card number, e.g. '12345'"),
    name: z.string().trim().min(1).describe("Full name of the student or staff member"),
    position: z.enum(["Student", "Staff"]).describe("Role printed on the card"),
    templateId: z.string().trim().min(1).default("classic").describe("Template id: classic, modern, minimal, or a custom template id"),
    extraFields: z.array(FieldSchema).default([]).describe("Additional custom fields to include"),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ cardNo, name, position, templateId, extraFields }) => {
    const payload = {
      templateId,
      cardNo,
      barcodeValue: `IQRA-${cardNo.replace(/\s+/g, "").toUpperCase().padStart(8, "0")}`,
      fields: [
        { label: "Name", value: name, side: "front" as const },
        { label: "Position", value: position, side: "front" as const },
        { label: "Card No.", value: cardNo, side: "front" as const },
        ...extraFields,
      ],
    };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
