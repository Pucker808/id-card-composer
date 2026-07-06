import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "list_builtin_templates",
  title: "List built-in ID card templates",
  description: "Return the list of built-in ID card template identifiers and display names shipped with the IQRA ID Card Generator.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => {
    const templates = [
      { id: "classic", name: "Classic (Orange)" },
      { id: "modern", name: "Modern (Navy Sidebar)" },
      { id: "minimal", name: "Minimal (Clean)" },
    ];
    return {
      content: [{ type: "text", text: JSON.stringify(templates, null, 2) }],
      structuredContent: { templates },
    };
  },
});

// keep zod imported so future schema additions type-check cleanly
void z;
