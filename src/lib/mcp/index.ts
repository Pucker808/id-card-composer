import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listTemplatesTool from "./tools/list-templates";
import buildCardPayloadTool from "./tools/build-card-payload";

// The OAuth issuer MUST be the direct Supabase host — Lovable's proxy URL
// is rejected by mcp-js (RFC 8414 issuer mismatch). The project ref is the
// only Supabase value that survives publish unchanged.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "iqra-id-card-mcp",
  title: "IQRA ID Card Generator",
  version: "0.1.0",
  instructions:
    "Tools for the IQRA Rozatul Atfal ID Card Generator. Use `list_builtin_templates` to discover available card templates, and `build_card_payload` to compose a JSON payload for a student or staff ID card.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listTemplatesTool, buildCardPayloadTool],
});
