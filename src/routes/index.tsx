import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import JsBarcode from "jsbarcode";

function Barcode({ value }: { value: string }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    try {
      JsBarcode(svg, value || "0000", {
        format: "CODE128",
        width: 2,
        height: 40,
        margin: 0,
        displayValue: false,
        background: "#ffffff",
        lineColor: "#000000",
      });
      // JsBarcode sets pixel width/height but NO viewBox, so without this the
      // barcode renders at its intrinsic pixel size and gets clipped inside
      // the card (looks like only a slice of a barcode). Add a viewBox so the
      // SVG scales to fill the container while preserveAspectRatio="none"
      // stretches it horizontally.
      const w = svg.getAttribute("width");
      const h = svg.getAttribute("height");
      if (w && h) svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
      svg.removeAttribute("width");
      svg.removeAttribute("height");
      svg.setAttribute("preserveAspectRatio", "none");
    } catch {
      /* ignore */
    }
  }, [value]);
  return <svg ref={ref} className="barcode-svg" preserveAspectRatio="none" />;
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "IQRA Rozatul Atfal — ID Card Generator" },
      { name: "description", content: "Offline ID card generator for IQRA Rozatul Atfal, OTS Road Kohat." },
    ],
  }),
  component: IdCardApp,
});

type Position = "Staff" | "Student";
type FieldSide = "front" | "back";
interface CardField {
  id: string;
  label: string;
  value: string;
  side: FieldSide;
  isDefault?: boolean;
}
interface CustomTemplate {
  id: string;
  name: string;
  css: string;
}

const TPL_STORAGE_KEY = "iqra_custom_templates";

function sanitizeCss(raw: string): string {
  return raw
    .replace(/<\/?(script|style)[^>]*>/gi, "")
    .replace(/@import[^;]*;?/gi, "")
    .replace(/expression\s*\(/gi, "")
    .replace(/javascript\s*:/gi, "")
    .replace(/behavior\s*:/gi, "");
}

function scopedCss(tpl: CustomTemplate): string {
  return `.tpl-custom-${tpl.id} {\n${sanitizeCss(tpl.css)}\n}\n`;
}

const STARTER_CSS = `/* Target the existing card structure. All selectors are auto-scoped to this template.
   Front selectors: .front-header, .hdr-logo, .hdr-text, .school-name, .school-addr,
     .front-sub, .sub-left, .card-no-line, .card-no,
     .front-body, .front-left, .front-right, .name-line, .desig-line,
     .photo-box, .photo-img, .sig-label-box, .sig-overlay-label, .sig-label,
     .front-footer, .contact-line, .barcode
   Back selectors (prefix with &.back): .back-header, .bh-left, .bh-right,
     .back-body, .back-row, .bk-label, .bk-value, .back-footer, .watermark
   Data is injected by React — do NOT remove fields, only restyle.
*/

.front-header {
  background: linear-gradient(90deg, #2d3748 0%, #4a5568 100%);
  color: #fff;
  border-radius: 0;
}
.school-name, .school-addr { color: #fff; }
.name-line { color: #2d3748; }
.front-footer { background: #2d3748; color: #fff; padding: 0.5mm 2mm; border-radius: 1mm; }
.contact-line { color: #fff; }
.barcode span { background: #fff; }

&.back .back-header { background: #2d3748; color: #fff; border-bottom: none; }
&.back .bh-right { color: #fff; }
&.back .bk-label { color: #2d3748; }
`;

const CLASS_OPTIONS = [
  "Nursery", "Prep",
  "Class: One", "Class: Two", "Class: Three",
  "Class: 4th", "Class: 5th", "Class: Prep-6th",
  "Class: 6th", "Class: 7th", "Class: 8th", "Class: 9th", "Class: 10th",
];

const STAFF_DEFAULTS: Array<{ label: string; side: FieldSide }> = [
  { label: "CNIC No", side: "back" },
  { label: "Personal Contact No", side: "back" },
  { label: "Father Name", side: "back" },
  { label: "Blood Group", side: "back" },
  { label: "Designation", side: "back" },
  { label: "Address", side: "back" },
];
const STUDENT_DEFAULTS: Array<{ label: string; side: FieldSide }> = [
  { label: "Father Name", side: "back" },
  { label: "Emergency Contact No", side: "back" },
  { label: "Blood Group", side: "back" },
  { label: "Class", side: "back" },
  { label: "Address", side: "back" },
];
const buildDefaults = (pos: Position): CardField[] =>
  (pos === "Staff" ? STAFF_DEFAULTS : STUDENT_DEFAULTS).map((d) => ({
    id: uid(), label: d.label, value: "", side: d.side, isDefault: true,
  }));

const uid = () => Math.random().toString(36).slice(2, 9);
const pad4 = (n: number) => n.toString().padStart(4, "0");

function Editable({
  value, onChange, className, as: As = "span", style, "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  as?: "span" | "div";
  style?: React.CSSProperties;
  "aria-label"?: string;
}) {
  return (
    <As
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-label={ariaLabel}
      className={`editable ${className ?? ""}`}
      style={style}
      onBlur={(e) => onChange((e.target as HTMLElement).innerText)}
      dangerouslySetInnerHTML={{ __html: value }}
    />
  );
}

export function IdCardApp() {
  const [cardNo, setCardNo] = useState<string>(() => {
    if (typeof window === "undefined") return "0001";
    return localStorage.getItem("iqra_next_card") ?? "0001";
  });
  const [position, setPosition] = useState<Position>("Staff");
  const [template, setTemplate] = useState<string>("classic");
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem(TPL_STORAGE_KEY) ?? "[]"); }
    catch { return []; }
  });
  const [tplManagerOpen, setTplManagerOpen] = useState(false);
  const [editingTpl, setEditingTpl] = useState<CustomTemplate | null>(null);
  const tplImportInput = useRef<HTMLInputElement>(null);
  const [designation, setDesignation] = useState("Principal");
  const [studentClass, setStudentClass] = useState("Nursery");
  const [name, setName] = useState("Full Name Here");
  const [photo, setPhoto] = useState<string | null>(null);
  const [logo, setLogo] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [signatureOpacity, setSignatureOpacity] = useState<number>(55);
  const [watermark, setWatermark] = useState<string | null>(null);
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(12);

  // Card text
  const [schoolName, setSchoolName] = useState("IQRA ROZATUL ATFAL");
  const [schoolAddr, setSchoolAddr] = useState("OTS ROAD KOHAT");
  const [officeContact, setOfficeContact] = useState("Office Contact: 0333-9621836");
  const [footerNote, setFooterNote] = useState("If found please drop in a nearest dropbox");
  const [expiry, setExpiry] = useState("31-12-2028");

  // Personal info fields (defaults swap on position change; custom fields preserved)
  const [fields, setFields] = useState<CardField[]>(() => buildDefaults("Staff"));

  // Swap default fields when position changes; preserve any custom (non-default) fields
  useEffect(() => {
    setFields((prev) => {
      const custom = prev.filter((f) => !f.isDefault);
      return [...buildDefaults(position), ...custom];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position]);

  const [newLabel, setNewLabel] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newSide, setNewSide] = useState<FieldSide>("back");

  const photoInput = useRef<HTMLInputElement>(null);
  const logoInput = useRef<HTMLInputElement>(null);
  const sigInput = useRef<HTMLInputElement>(null);
  const wmInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem("iqra_next_card", cardNo);
  }, [cardNo]);

  useEffect(() => {
    localStorage.setItem(TPL_STORAGE_KEY, JSON.stringify(customTemplates));
  }, [customTemplates]);

  const saveTemplate = (tpl: CustomTemplate) => {
    setCustomTemplates((prev) => {
      const idx = prev.findIndex((t) => t.id === tpl.id);
      if (idx === -1) return [...prev, tpl];
      const next = [...prev]; next[idx] = tpl; return next;
    });
  };
  const deleteTemplate = (id: string) => {
    setCustomTemplates((prev) => prev.filter((t) => t.id !== id));
    if (template === `custom-${id}`) setTemplate("classic");
  };
  const exportTemplate = (tpl: CustomTemplate) => {
    const blob = new Blob([`/* name: ${tpl.name} */\n${tpl.css}`], { type: "text/css" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${tpl.name.replace(/[^a-z0-9]+/gi, "_")}.css`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const importTemplate = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      const text = r.result as string;
      const nameMatch = text.match(/\/\*\s*name:\s*([^*]+)\*\//i);
      const name = nameMatch?.[1].trim() || f.name.replace(/\.css$/i, "");
      saveTemplate({ id: uid(), name, css: text });
    };
    r.readAsText(f);
    e.target.value = "";
  };

  const readFile = (e: ChangeEvent<HTMLInputElement>, setter: (s: string) => void) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setter(reader.result as string);
    reader.readAsDataURL(f);
  };

  const subHeaderLeft = position === "Staff" ? "SERVICE CARD" : "STUDENT ID CARD";
  const designationOrClass = position === "Staff" ? designation : studentClass;

  const addField = () => {
    if (!newLabel.trim()) return;
    setFields([...fields, { id: uid(), label: newLabel, value: newValue, side: newSide }]);
    setNewLabel(""); setNewValue("");
  };
  const removeField = (id: string) => setFields(fields.filter((f) => f.id !== id));
  const updateField = (id: string, patch: Partial<CardField>) =>
    setFields(fields.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  const nextCard = () => {
    const n = parseInt(cardNo, 10);
    if (!Number.isNaN(n)) setCardNo(pad4(n + 1));
    else setCardNo("0001");
  };

  return (
    <main className="min-h-screen bg-slate-100 print:bg-white">
      <style>{cardCss}</style>
      <style>{customTemplates.map(scopedCss).join("\n")}</style>

      {/* Control Panel */}
      <section aria-labelledby="fields-heading" className="no-print border-b bg-white shadow-sm">
        <div className="mx-auto max-w-6xl p-4 space-y-3">
          <h2 id="fields-heading" className="sr-only">Personal Information Fields</h2>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-slate-800">IQRA Rozatul Atfal — ID Card Generator</h1>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium text-slate-700">Template:</span>
              <select className="border rounded px-2 py-1" value={template}
                onChange={(e) => setTemplate(e.target.value)}>
                <optgroup label="Built-in">
                  <option value="classic">Classic (Orange)</option>
                  <option value="modern">Modern (Navy Sidebar)</option>
                  <option value="minimal">Minimal (Clean)</option>
                </optgroup>
                {customTemplates.length > 0 && (
                  <optgroup label="Custom">
                    {customTemplates.map((t) => (
                      <option key={t.id} value={`custom-${t.id}`}>{t.name}</option>
                    ))}
                  </optgroup>
                )}
              </select>
              <button onClick={() => { setEditingTpl(null); setTplManagerOpen(true); }}
                className="px-2 py-1 bg-indigo-600 text-white rounded text-xs">
                Manage Templates
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
            <label className="flex flex-col">
              <span className="font-medium text-slate-700">Card No.</span>
              <div className="flex gap-1">
                <input className="border rounded px-2 py-1 flex-1" value={cardNo}
                  onChange={(e) => setCardNo(e.target.value)} />
                <button onClick={nextCard} className="px-2 py-1 bg-slate-800 text-white rounded text-xs">+1</button>
              </div>
            </label>
            <label className="flex flex-col">
              <span className="font-medium text-slate-700">Position</span>
              <select className="border rounded px-2 py-1" value={position}
                onChange={(e) => setPosition(e.target.value as Position)}>
                <option>Staff</option>
                <option>Student</option>
              </select>
            </label>
            {position === "Staff" ? (
              <label className="flex flex-col">
                <span className="font-medium text-slate-700">Designation</span>
                <input className="border rounded px-2 py-1" value={designation}
                  onChange={(e) => setDesignation(e.target.value)} />
              </label>
            ) : (
              <label className="flex flex-col">
                <span className="font-medium text-slate-700">Class</span>
                <select className="border rounded px-2 py-1" value={studentClass}
                  onChange={(e) => setStudentClass(e.target.value)}>
                  {CLASS_OPTIONS.map((c) => <option key={c}>{c}</option>)}
                </select>
              </label>
            )}
            <label className="flex flex-col">
              <span className="font-medium text-slate-700">Name</span>
              <input className="border rounded px-2 py-1" value={name}
                onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="flex flex-col">
              <span className="font-medium text-slate-700">Expiry</span>
              <input className="border rounded px-2 py-1" value={expiry}
                onChange={(e) => setExpiry(e.target.value)} />
            </label>
            <label className="flex flex-col">
              <span className="font-medium text-slate-700">Photo</span>
              <input ref={photoInput} type="file" accept="image/*"
                onChange={(e) => readFile(e, setPhoto)} className="text-xs" />
            </label>
            <label className="flex flex-col">
              <span className="font-medium text-slate-700">Logo</span>
              <input ref={logoInput} type="file" accept="image/*"
                onChange={(e) => readFile(e, setLogo)} className="text-xs" />
            </label>
            <label className="flex flex-col">
              <span className="font-medium text-slate-700">Signature/Stamp</span>
              <input ref={sigInput} type="file" accept="image/*"
                onChange={(e) => readFile(e, setSignature)} className="text-xs" />
            </label>
            <label className="flex flex-col sm:col-span-2 lg:col-span-2">
              <span className="font-medium text-slate-700">
                Signature/Stamp Opacity: {signatureOpacity}%
              </span>
              <input type="range" min={0} max={100} step={1}
                value={signatureOpacity}
                onChange={(e) => setSignatureOpacity(parseInt(e.target.value, 10))} />
            </label>
            <label className="flex flex-col">
              <span className="font-medium text-slate-700">Back Watermark</span>
              <input ref={wmInput} type="file" accept="image/*"
                onChange={(e) => readFile(e, setWatermark)} className="text-xs" />
            </label>
            <label className="flex flex-col sm:col-span-2 lg:col-span-2">
              <span className="font-medium text-slate-700">
                Watermark Opacity: {watermarkOpacity}%
              </span>
              <input type="range" min={0} max={100} step={1}
                value={watermarkOpacity}
                onChange={(e) => setWatermarkOpacity(parseInt(e.target.value, 10))} />
            </label>
          </div>

          {/* Field editor */}
          <div className="border-t pt-3">
            <div className="font-semibold text-slate-700 text-sm mb-2">Personal Information Fields</div>
            <div className="space-y-1">
              {fields.map((f) => (
                <div key={f.id} className="grid grid-cols-12 gap-1 items-center text-xs">
                  <input aria-label={`${f.label} label`} className="col-span-3 border rounded px-2 py-1" value={f.label}
                    onChange={(e) => updateField(f.id, { label: e.target.value })} />
                  <input aria-label={`${f.label} value`} className="col-span-6 border rounded px-2 py-1" value={f.value}
                    onChange={(e) => updateField(f.id, { value: e.target.value })} />
                  <select aria-label={`${f.label} card side`} className="col-span-2 border rounded px-2 py-1" value={f.side}
                    onChange={(e) => updateField(f.id, { side: e.target.value as FieldSide })}>
                    <option value="front">Front</option>
                    <option value="back">Back</option>
                  </select>
                  <button onClick={() => removeField(f.id)} aria-label={`Remove ${f.label} field`}
                    className="col-span-1 bg-red-500 text-white rounded py-1">×</button>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-12 gap-1 mt-2 text-xs">
              <input placeholder="New label" aria-label="New field label" className="col-span-3 border rounded px-2 py-1"
                value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
              <input placeholder="Value" aria-label="New field value" className="col-span-6 border rounded px-2 py-1"
                value={newValue} onChange={(e) => setNewValue(e.target.value)} />
              <select aria-label="New field card side" className="col-span-2 border rounded px-2 py-1" value={newSide}
                onChange={(e) => setNewSide(e.target.value as FieldSide)}>
                <option value="front">Front</option>
                <option value="back">Back</option>
              </select>
              <button onClick={addField} aria-label="Add custom field" className="col-span-1 bg-emerald-600 text-white rounded">+</button>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={() => window.print()}
              className="px-4 py-2 bg-blue-600 text-white rounded font-medium text-sm">
              🖨 Print ID Card
            </button>
            <button onClick={nextCard}
              className="px-4 py-2 bg-slate-700 text-white rounded font-medium text-sm">
              Next Card #
            </button>
          </div>
        </div>
      </section>

      {/* Cards */}
      <section aria-labelledby="preview-heading" className="cards-wrap mx-auto max-w-6xl p-4 flex flex-wrap gap-6 justify-center">
        <h2 id="preview-heading" className="sr-only">ID Card Preview</h2>
        {/* FRONT */}
        <div className={`id-card tpl-${template}`}>
          <div className="front-header">
            {logo && <img src={logo} alt="School emblem" className="hdr-logo" />}
            <div className="hdr-text">
              <Editable value={schoolName} onChange={setSchoolName} className="school-name" />
              <Editable value={schoolAddr} onChange={setSchoolAddr} className="school-addr" />
            </div>
          </div>
          <div className="front-sub">
            <div className="sub-left-col">
              <Editable value={subHeaderLeft} onChange={() => {}} className="sub-left" />
              <div className="card-no-line">
                CARD NO. <span className="card-no" contentEditable suppressContentEditableWarning
                  onBlur={(e) => setCardNo((e.target as HTMLElement).innerText)}>{cardNo}</span>
              </div>
            </div>
          </div>
          <div className="front-body">
            <div className="front-left">
              <Editable value={name} onChange={setName} className="name-line" />
              <Editable value={designationOrClass}
                onChange={(v) => position === "Staff" ? setDesignation(v) : setStudentClass(v)}
                className="desig-line" />
              {fields.filter((f) => f.side === "front").map((f) => (
                <div key={f.id} className="custom-field">
                  <span className="cf-label">{f.label}:</span>{" "}
                  <Editable value={f.value} onChange={(v) => updateField(f.id, { value: v })} aria-label={f.label} />
                  <button className="rm-btn no-print" aria-label={`Remove ${f.label} field`} onClick={() => removeField(f.id)}>×</button>
                </div>
              ))}
            </div>
            <div className="front-right">
              <div className="photo-box" onClick={() => photoInput.current?.click()}>
                {photo ? <img src={photo} alt={`${position} portrait of ${name}`} className="photo-img" /> : <span>PHOTO</span>}
              </div>
              <div className="sig-label-box">
                {signature && <img src={signature} alt="Official signature stamp" className="sig-overlay-label"
                  style={{ opacity: signatureOpacity / 100 }} />}
                <div className="sig-label">Issuing Authority</div>
              </div>
            </div>
          </div>
          <div className="front-footer">
            <Editable value={officeContact} onChange={setOfficeContact} className="contact-line" />
            <div className="barcode">
              <Barcode value={cardNo} />
            </div>
          </div>
        </div>

        {/* BACK */}
        <div className={`id-card back tpl-${template}`}>
          {watermark && (
            <img src={watermark} className="watermark" alt=""
              style={{ opacity: watermarkOpacity / 100 }} />
          )}
          <div className="back-header">
            <span className="bh-left">Personal Information:</span>
            <span className="bh-right">
              Expiry: <Editable value={expiry} onChange={setExpiry} />
            </span>
          </div>
          <div className="back-body">
            {fields.filter((f) => f.side === "back").map((f) => (
              <div key={f.id} className="back-row">
                <span className="bk-label">{f.label}</span>
                <div className="bk-value-wrap">
                  <Editable value={f.value} onChange={(v) => updateField(f.id, { value: v })}
                    className="bk-value" aria-label={f.label} />
                </div>
                <button className="rm-btn no-print" aria-label={`Remove ${f.label} field`} onClick={() => removeField(f.id)}>×</button>
              </div>
            ))}
          </div>
          <div className="back-footer">
            <Editable value={footerNote} onChange={setFooterNote} />
          </div>
        </div>
      </section>

      {tplManagerOpen && (
        <TemplateManager
          templates={customTemplates}
          editing={editingTpl}
          onClose={() => { setTplManagerOpen(false); setEditingTpl(null); }}
          onEdit={(t) => setEditingTpl(t)}
          onSave={(t) => { saveTemplate(t); setEditingTpl(null); }}
          onDelete={deleteTemplate}
          onExport={exportTemplate}
          onImportClick={() => tplImportInput.current?.click()}
          onUse={(id) => { setTemplate(`custom-${id}`); setTplManagerOpen(false); setEditingTpl(null); }}
        />
      )}
      <input ref={tplImportInput} type="file" accept=".css,text/css"
        className="hidden" onChange={importTemplate} aria-label="Import custom template CSS file" />
    </main>
  );
}

function TemplateManager({
  templates, editing, onClose, onEdit, onSave, onDelete, onExport, onImportClick, onUse,
}: {
  templates: CustomTemplate[];
  editing: CustomTemplate | null;
  onClose: () => void;
  onEdit: (t: CustomTemplate | null) => void;
  onSave: (t: CustomTemplate) => void;
  onDelete: (id: string) => void;
  onExport: (t: CustomTemplate) => void;
  onImportClick: () => void;
  onUse: (id: string) => void;
}) {
  const [name, setName] = useState(editing?.name ?? "");
  const [css, setCss] = useState(editing?.css ?? STARTER_CSS);
  const isEditing = editing !== null;

  useEffect(() => {
    setName(editing?.name ?? "");
    setCss(editing?.css ?? STARTER_CSS);
  }, [editing]);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ id: editing?.id ?? uid(), name: name.trim(), css });
  };

  return (
    <div className="no-print fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-bold text-lg">Custom Templates</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800 text-xl">×</button>
        </div>

        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-sm text-slate-700">Saved Templates</h3>
            <div className="flex gap-2">
              <button onClick={onImportClick}
                className="px-3 py-1 bg-slate-700 text-white rounded text-xs">⬆ Import .css</button>
              <button onClick={() => onEdit(null)}
                className="px-3 py-1 bg-emerald-600 text-white rounded text-xs">➕ New</button>
            </div>
          </div>
          {templates.length === 0 ? (
            <p className="text-sm text-slate-500 italic">No custom templates yet.</p>
          ) : (
            <ul className="space-y-1">
              {templates.map((t) => (
                <li key={t.id} className="flex items-center gap-2 text-sm bg-slate-50 px-2 py-1 rounded">
                  <span className="flex-1 font-medium">{t.name}</span>
                  <button onClick={() => onUse(t.id)}
                    className="px-2 py-0.5 bg-blue-600 text-white rounded text-xs">Use</button>
                  <button onClick={() => onEdit(t)}
                    className="px-2 py-0.5 bg-amber-500 text-white rounded text-xs">Edit</button>
                  <button onClick={() => onExport(t)}
                    className="px-2 py-0.5 bg-slate-600 text-white rounded text-xs">Export</button>
                  <button onClick={() => { if (confirm(`Delete "${t.name}"?`)) onDelete(t.id); }}
                    className="px-2 py-0.5 bg-red-500 text-white rounded text-xs">Delete</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="p-4 space-y-2">
          <h3 className="font-semibold text-sm text-slate-700">
            {isEditing ? `Edit: ${editing!.name}` : "New Template"}
          </h3>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Name</span>
            <input className="w-full border rounded px-2 py-1 mt-1" value={name}
              onChange={(e) => setName(e.target.value)} placeholder="e.g. Green School" />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">CSS</span>
            <textarea className="w-full border rounded px-2 py-1 mt-1 font-mono text-xs"
              rows={14} value={css} onChange={(e) => setCss(e.target.value)} spellCheck={false} />
          </label>
          <p className="text-xs text-slate-500">
            Your CSS is auto-scoped to this template. Data fields (name, photo, fields, barcode)
            are rendered by the app — you can only restyle them, not remove them. That guarantees
            data mapping never breaks.
          </p>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={!name.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded text-sm disabled:opacity-50">
              {isEditing ? "Save Changes" : "Create Template"}
            </button>
            {isEditing && (
              <button onClick={() => onEdit(null)}
                className="px-4 py-2 bg-slate-300 rounded text-sm">Cancel</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const cardCss = `
.id-card {
  width: 85.6mm;
  height: 53.98mm;
  background: #fff;
  position: relative;
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
  font-family: Arial, sans-serif;
  color: #111;
  overflow: hidden;
  border: 1px solid #ddd;
  display: flex;
  flex-direction: column;
  padding: 2mm;
  box-sizing: border-box;
}
.editable { outline: none; }
.editable:focus { background: rgba(255,235,150,0.4); }

.front-header {
  background: linear-gradient(90deg, #fde4b1 0%, #f7a85a 60%, #f59442 100%);
  display: flex; align-items: center; gap: 2mm;
  padding: 1mm 2mm; border-radius: 1mm;
}
.hdr-logo { height: 9mm; width: 9mm; object-fit: contain; }
.hdr-text { flex: 1; text-align: center; line-height: 1.1; }
.school-name { font-weight: 700; font-size: 9pt; display: block; }
.school-addr { font-size: 7pt; display: block; }

.front-sub {
  display: flex; justify-content: flex-start;
  font-size: 6pt; padding: 0.5mm 1mm; color: #444;
}
.sub-left-col { display: flex; flex-direction: column; gap: 0.3mm; }
.sub-left { font-weight: 700; font-size: 7pt; }
.card-no-line { font-size: 6pt; }
.card-no { font-weight: bold; }

.front-body { display: flex; flex: 1; gap: 2mm; padding: 1mm 2mm; align-items: stretch; }
.front-left {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 2mm;
  text-align: center;
  padding-left: 4mm;
}
.name-line { font-size: 12pt; font-weight: 700; line-height: 1.1; letter-spacing: 0.3px; }
.desig-line { font-size: 10pt; font-weight: 600; line-height: 1.1; color: #222; }
.front-right { width: 24mm; display: flex; flex-direction: column; align-items: center; gap: 0.3mm; position: absolute; right: 3mm; top: 14mm; }
.photo-box {
  width: 18mm; height: 20mm; border: 1px solid #555;
  display: flex; align-items: center; justify-content: center;
  font-size: 6pt; color: #888; cursor: pointer; overflow: hidden;
  position: relative;
}
.photo-img { width: 100%; height: 100%; object-fit: cover; }
.sig-label-box { text-align: center; width: 24mm; margin-top: 0.4mm; display: flex; flex-direction: column; align-items: center; gap: 0.2mm; position: relative; }
.sig-overlay-label {
  position: absolute; left: 50%; top: -4mm;
  transform: translateX(-50%);
  width: 30mm; height: 16mm; object-fit: contain;
  pointer-events: none; z-index: 2;
}
.sig-label { font-size: 5pt; color: #444; border-top: 0.5px solid #777; padding-top: 0.2mm; width: 100%; display: block; position: relative; z-index: 1; }

.front-footer { display: flex; flex-direction: column; gap: 0.5mm; padding: 0 1mm; }
.contact-line { font-size: 6pt; }
.barcode { height: 8mm; display: flex; align-items: stretch; justify-content: center; background: #fff; }
.barcode-svg { width: 100%; height: 100%; display: block; shape-rendering: crispEdges; image-rendering: pixelated; }

.custom-field { font-size: 7pt; position: relative; }
.cf-label { font-weight: 600; }

/* BACK */
.id-card.back { background: #fff; padding-bottom: 5mm; }
.watermark {
  position: absolute; inset: 0; margin: auto;
  width: 60%; height: 60%; object-fit: contain;
  opacity: 0.12; pointer-events: none;
}
.back-header { display: flex; justify-content: space-between; align-items: center; font-size: 8pt; font-weight: 700; padding: 1mm 2mm; border-bottom: 1px solid #333; }
.bh-right { font-size: 6.5pt; font-weight: 500; }
.back-body { flex: 1; padding: 2mm 3mm; display: flex; flex-direction: column; gap: 1.4mm; position: relative; z-index: 1; }
.back-row { display: flex; align-items: flex-end; gap: 2mm; font-size: 7.5pt; width: 100%; }
.bk-label { min-width: 22mm; color: #111; font-weight: 600; }
.bk-value-wrap { flex: 1; display: flex; flex-direction: column; gap: 1mm; }
.bk-value {
  min-height: 3.2mm;
  line-height: 3.2mm;
  padding: 0 1mm;
  word-break: break-word;
  background-image: linear-gradient(to top, #333 0.6px, transparent 0.6px);
  background-size: 100% 3.2mm;
  background-position: 0 0;
  background-repeat: repeat-y;
}
.back-footer {
  position: absolute;
  bottom: 1mm; left: 0; right: 0;
  text-align: center;
  font-size: 6.5pt;
  color: #222;
  font-style: italic;
  z-index: 2;
}

.rm-btn {
  background: #ef4444; color: white; border: none; border-radius: 50%;
  width: 10px; height: 10px; font-size: 8px; line-height: 1;
  cursor: pointer; margin-left: 2px;
}

/* ===== Template: MODERN (navy, photo on left) ===== */
.tpl-modern .front-header {
  background: linear-gradient(90deg, #0f2c4a 0%, #16456e 60%, #1d5a8c 100%);
  color: #fff; border-radius: 0;
}
.tpl-modern .school-name, .tpl-modern .school-addr { color: #fff; }
.tpl-modern .front-right { left: 3mm; right: auto; top: 14mm; }
.tpl-modern .front-left { padding-left: 26mm; padding-right: 2mm; align-items: flex-start; text-align: left; }
.tpl-modern .photo-box { border: 2px solid #0f2c4a; border-radius: 1mm; }
.tpl-modern .sub-left-col { margin-left: 26mm; }
.tpl-modern .front-footer { background: #0f2c4a; color: #fff; padding: 0.5mm 2mm; border-radius: 1mm; }
.tpl-modern .contact-line { color: #fff; }
.tpl-modern .barcode { background: #fff; padding: 0.5mm; border-radius: 1mm; }
.tpl-modern.back .back-header { background: #0f2c4a; color: #fff; border-bottom: none; padding: 1.2mm 2mm; }
.tpl-modern.back .bh-right { color: #fff; }
.tpl-modern.back .bk-label { color: #0f2c4a; }
.tpl-modern.back .back-footer { color: #0f2c4a; font-weight: 600; }

/* ===== Template: MINIMAL (flat, clean) ===== */
.tpl-minimal { border: 1.5px solid #111; }
.tpl-minimal .front-header {
  background: #fff; border-radius: 0;
  border-bottom: 1.5px solid #111; padding: 1mm 2mm;
}
.tpl-minimal .school-name { font-size: 10pt; letter-spacing: 1px; }
.tpl-minimal .school-addr { font-size: 6.5pt; letter-spacing: 0.5px; color: #555; }
.tpl-minimal .sub-left { color: #888; font-weight: 500; letter-spacing: 2px; }
.tpl-minimal .photo-box { border: 1px solid #111; border-radius: 0; }
.tpl-minimal .name-line { font-weight: 800; letter-spacing: 0.5px; }
.tpl-minimal .desig-line { color: #666; font-weight: 400; font-style: italic; }
.tpl-minimal .barcode { display: none; }
.tpl-minimal .front-footer { border-top: 0.5px solid #ccc; padding-top: 0.5mm; }
.tpl-minimal.back .back-header { border-bottom: 1px solid #111; }
.tpl-minimal.back .bk-label { font-weight: 500; color: #666; text-transform: uppercase; font-size: 6.5pt; letter-spacing: 0.5px; }



@media print {
  body, html { background: white !important; }
  .no-print { display: none !important; }
  .cards-wrap { padding: 0 !important; gap: 8mm !important; }
  .id-card { box-shadow: none !important; border: 1px dashed #ccc; }
  @page { size: auto; margin: 10mm; }
}
`;
