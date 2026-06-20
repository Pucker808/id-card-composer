import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ChangeEvent } from "react";

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
  value, onChange, className, as: As = "span", style,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  as?: "span" | "div";
  style?: React.CSSProperties;
}) {
  return (
    <As
      contentEditable
      suppressContentEditableWarning
      className={`editable ${className ?? ""}`}
      style={style}
      onBlur={(e) => onChange((e.target as HTMLElement).innerText)}
      dangerouslySetInnerHTML={{ __html: value }}
    />
  );
}

function IdCardApp() {
  const [cardNo, setCardNo] = useState<string>(() => {
    if (typeof window === "undefined") return "0001";
    return localStorage.getItem("iqra_next_card") ?? "0001";
  });
  const [position, setPosition] = useState<Position>("Staff");
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
    <div className="min-h-screen bg-slate-100 print:bg-white">
      <style>{cardCss}</style>

      {/* Control Panel */}
      <div className="no-print border-b bg-white shadow-sm">
        <div className="mx-auto max-w-6xl p-4 space-y-3">
          <h1 className="text-xl font-bold text-slate-800">IQRA Rozatul Atfal — ID Card Generator</h1>
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
                  <input className="col-span-3 border rounded px-2 py-1" value={f.label}
                    onChange={(e) => updateField(f.id, { label: e.target.value })} />
                  <input className="col-span-6 border rounded px-2 py-1" value={f.value}
                    onChange={(e) => updateField(f.id, { value: e.target.value })} />
                  <select className="col-span-2 border rounded px-2 py-1" value={f.side}
                    onChange={(e) => updateField(f.id, { side: e.target.value as FieldSide })}>
                    <option value="front">Front</option>
                    <option value="back">Back</option>
                  </select>
                  <button onClick={() => removeField(f.id)}
                    className="col-span-1 bg-red-500 text-white rounded py-1">×</button>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-12 gap-1 mt-2 text-xs">
              <input placeholder="New label" className="col-span-3 border rounded px-2 py-1"
                value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
              <input placeholder="Value" className="col-span-6 border rounded px-2 py-1"
                value={newValue} onChange={(e) => setNewValue(e.target.value)} />
              <select className="col-span-2 border rounded px-2 py-1" value={newSide}
                onChange={(e) => setNewSide(e.target.value as FieldSide)}>
                <option value="front">Front</option>
                <option value="back">Back</option>
              </select>
              <button onClick={addField} className="col-span-1 bg-emerald-600 text-white rounded">+</button>
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
      </div>

      {/* Cards */}
      <div className="cards-wrap mx-auto max-w-6xl p-4 flex flex-wrap gap-6 justify-center">
        {/* FRONT */}
        <div className="id-card">
          <div className="front-header">
            {logo && <img src={logo} alt="logo" className="hdr-logo" />}
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
                  <Editable value={f.value} onChange={(v) => updateField(f.id, { value: v })} />
                  <button className="rm-btn no-print" onClick={() => removeField(f.id)}>×</button>
                </div>
              ))}
            </div>
            <div className="front-right">
              <div className="photo-box" onClick={() => photoInput.current?.click()}>
                {photo ? <img src={photo} alt="photo" className="photo-img" /> : <span>PHOTO</span>}
              </div>
              <div className="sig-label-box">
                {signature && <img src={signature} alt="sig" className="sig-overlay-label"
                  style={{ opacity: signatureOpacity / 100 }} />}
                <div className="sig-label">Issuing Authority</div>
              </div>
            </div>
          </div>
          <div className="front-footer">
            <Editable value={officeContact} onChange={setOfficeContact} className="contact-line" />
            <div className="barcode">
              {Array.from({ length: 60 }).map((_, i) => (
                <span key={i} style={{ width: `${1 + (i % 3)}px` }} />
              ))}
            </div>
          </div>
        </div>

        {/* BACK */}
        <div className="id-card back">
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
            {fields.filter((f) => f.side === "back").map((f) => {
              const isAddress = f.label.trim().toLowerCase() === "address";
              const needsExtra = isAddress && f.value.length > 38;
              return (
                <div key={f.id} className="back-row">
                  <span className="bk-label">{f.label}</span>
                  <div className="bk-value-wrap">
                    <Editable value={f.value} onChange={(v) => updateField(f.id, { value: v })}
                      className="bk-value" />
                    {needsExtra && <div className="bk-value bk-value-extra" />}
                  </div>
                  <button className="rm-btn no-print" onClick={() => removeField(f.id)}>×</button>
                </div>
              );
            })}
          </div>
          <div className="back-footer">
            <Editable value={footerNote} onChange={setFooterNote} />
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
.barcode { display: flex; gap: 1px; height: 4mm; align-items: stretch; }
.barcode span { background: #000; display: inline-block; }

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
.bk-value { min-height: 3.2mm; border-bottom: 0.6px solid #333; padding: 0 1mm 0.3mm; word-break: break-word; }
.bk-value-extra { min-height: 3.2mm; }
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

@media print {
  body, html { background: white !important; }
  .no-print { display: none !important; }
  .cards-wrap { padding: 0 !important; gap: 8mm !important; }
  .id-card { box-shadow: none !important; border: 1px dashed #ccc; }
  @page { size: auto; margin: 10mm; }
}
`;
