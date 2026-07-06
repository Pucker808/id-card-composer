import { defineMcp } from "@lovable.dev/mcp-js";
import listTemplatesTool from "./tools/list-templates";
import buildCardPayloadTool from "./tools/build-card-payload";

export default defineMcp({
  name: "iqra-id-card-mcp",
  title: "IQRA ID Card Generator",
  version: "0.1.0",
  instructions:
    "Tools for the IQRA Rozatul Atfal ID Card Generator. Use `list_builtin_templates` to discover available card templates, and `build_card_payload` to compose a JSON payload for a student or staff ID card.",
  tools: [listTemplatesTool, buildCardPayloadTool],
});
