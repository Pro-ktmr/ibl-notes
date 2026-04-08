import type { Note, CycleTab, LikertValue } from "@/types/note";
import { jsPDF } from "jspdf";

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const STAGE_LABELS: Record<string, string> = {
  "課題の設定": "①課題の設定",
  "課題解決の過程": "②課題解決の過程",
  "分析・考察・推論": "③分析・考察・推論",
  "表現・伝達": "④表現・伝達",
};

const LIKERT_LABEL: Record<number, string> = {
  4: "とてもそう思う",
  3: "ややそう思う",
  2: "あまりそう思わない",
  1: "そう思わない",
};

const CYCLE_FIELDS: { key: keyof CycleTab; label: string }[] = [
  { key: "taskSetting", label: "①課題の設定" },
  { key: "problemSolving", label: "②課題解決の過程" },
  { key: "analysis", label: "③分析・考察・推論" },
  { key: "expression", label: "④表現・伝達" },
];

function likertText(v: LikertValue): string {
  return v ? LIKERT_LABEL[v] : "未回答";
}

/* ------------------------------------------------------------------ */
/*  Cycle history (same logic as PrintView)                           */
/* ------------------------------------------------------------------ */

interface FieldHistory {
  key: keyof CycleTab;
  label: string;
  history: { date: string; value: string }[];
}

function buildCycleHistory(notes: Note[]) {
  const chronological = [...notes].reverse();
  const maxCycles = Math.max(...chronological.map((n) => n.cycleTabs.length), 0);

  const cycles: { cycleIndex: number; fields: FieldHistory[] }[] = [];
  for (let ci = 0; ci < maxCycles; ci++) {
    const fields: FieldHistory[] = CYCLE_FIELDS.map((f) => {
      const history: { date: string; value: string }[] = [];
      for (const note of chronological) {
        const tab = note.cycleTabs[ci];
        if (!tab) continue;
        const val = tab[f.key].trim();
        if (val === "") continue;
        if (history.length === 0 || history[history.length - 1].value !== val) {
          history.push({ date: note.date, value: val });
        }
      }
      return { ...f, history };
    });
    cycles.push({ cycleIndex: ci, fields });
  }
  return cycles;
}

function getLatestDiffStatus(
  notes: Note[],
  cycleIndex: number,
  fieldKey: keyof CycleTab,
): "new" | "changed" | "same" {
  if (notes.length === 0) return "same";
  const latestTab = notes[0].cycleTabs[cycleIndex];
  if (!latestTab) return "same";
  const cur = latestTab[fieldKey].trim();
  if (cur === "") return "same";
  const prev = notes.length > 1 ? notes[1] : undefined;
  if (!prev) return "new";
  const prevTab = prev.cycleTabs[cycleIndex];
  if (!prevTab) return "new";
  const prevVal = prevTab[fieldKey].trim();
  if (prevVal === "" && cur !== "") return "new";
  if (prevVal !== "" && cur !== "" && prevVal !== cur) return "changed";
  return "same";
}

/* ------------------------------------------------------------------ */
/*  PDF writer helpers                                                */
/* ------------------------------------------------------------------ */

const PAGE_W = 210; // A4 mm
const PAGE_H = 297;
const MARGIN = 15;
const CONTENT_W = PAGE_W - MARGIN * 2;
const FONT_NORMAL = 10;
const FONT_SMALL = 8;
const FONT_TITLE = 14;
const FONT_H3 = 11;
const LINE_H = 5; // mm per line at normal size
const BOX_PAD = 4; // padding inside border boxes

/** Ensure enough room or add a new page. Returns the (possibly updated) y. */
function ensureSpace(pdf: jsPDF, y: number, need: number): number {
  if (y + need > PAGE_H - MARGIN) {
    pdf.addPage();
    return MARGIN;
  }
  return y;
}

/** Split text into lines that fit within maxWidth, return line count. */
function writeWrapped(
  pdf: jsPDF,
  text: string,
  x: number,
  startY: number,
  maxWidth: number,
  lineHeight: number,
): number {
  const lines = pdf.splitTextToSize(text, maxWidth) as string[];
  let y = startY;
  for (const line of lines) {
    y = ensureSpace(pdf, y, lineHeight);
    pdf.text(line, x, y);
    y += lineHeight;
  }
  return y;
}

/* ------------------------------------------------------------------ */
/*  Main PDF generation – pure jsPDF, no html2canvas                  */
/* ------------------------------------------------------------------ */

// Load the font once – cached across calls
let fontReady: Promise<void> | null = null;

async function ensureJapaneseFont(pdf: jsPDF): Promise<void> {
  if (!fontReady) {
    fontReady = (async () => {
      const res = await fetch("/fonts/NotoSansJP-VariableFont_wght.ttf");
      if (!res.ok) throw new Error("フォントの読み込みに失敗しました");
      const buf = await res.arrayBuffer();
      const binary = Array.from(new Uint8Array(buf))
        .map((b) => String.fromCharCode(b))
        .join("");
      const base64 = btoa(binary);
      pdf.addFileToVFS("NotoSansJP-Regular.ttf", base64);
      pdf.addFont("NotoSansJP-Regular.ttf", "NotoSansJP", "normal");
    })();
  }
  await fontReady;
  pdf.setFont("NotoSansJP", "normal");
}

export async function generatePdfBlob(notes: Note[]): Promise<Blob> {
  // Reset font cache so the font is added to this specific pdf instance
  fontReady = null;

  const pdf = new jsPDF("p", "mm", "a4");
  await ensureJapaneseFont(pdf);

  let y = MARGIN;

  /* ---------- 前半: 今日の振り返り ---------- */
  pdf.setFontSize(FONT_TITLE);
  pdf.text("今日の振り返り", MARGIN, y);
  y += 2;
  pdf.setDrawColor(0);
  pdf.setLineWidth(0.5);
  pdf.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 6;

  for (const note of notes) {
    // estimate space
    y = ensureSpace(pdf, y, 30);

    // border box start – leave padding above the first text line
    const boxStartY = y;
    y += BOX_PAD;

    pdf.setFontSize(FONT_H3);
    pdf.text(`${note.title}（${note.date}）`, MARGIN + BOX_PAD, y);
    y += 6;

    pdf.setFontSize(FONT_NORMAL);

    // 活動内容
    pdf.text("今日の活動内容：", MARGIN + BOX_PAD, y);
    const actText = note.reflection.whatDidToday || "（未記入）";
    y = writeWrapped(pdf, actText, MARGIN + 40, y, CONTENT_W - 42, LINE_H);
    y += 1;

    // 段階
    const stagesText =
      note.reflection.stages.length > 0
        ? note.reflection.stages.map((s) => STAGE_LABELS[s] || s).join("、")
        : "（未選択）";
    pdf.text("実施した段階：", MARGIN + BOX_PAD, y);
    y = writeWrapped(pdf, stagesText, MARGIN + 40, y, CONTENT_W - 42, LINE_H);
    y += 1;

    // Likert
    for (const [label, val] of [
      ["楽しかった：", note.reflection.enjoyment],
      ["学びがあった：", note.reflection.learning],
      ["将来のためになる：", note.reflection.future],
    ] as [string, LikertValue][]) {
      y = ensureSpace(pdf, y, LINE_H);
      pdf.text(`${label}${likertText(val)}`, MARGIN + BOX_PAD, y);
      y += LINE_H;
    }

    y += BOX_PAD - 2; // bottom padding

    // Draw border around note
    pdf.setDrawColor(160);
    pdf.roundedRect(MARGIN, boxStartY, CONTENT_W, y - boxStartY, 2, 2);
    y += 6;
  }

  /* ---------- 改ページ: サイクルノート ---------- */
  pdf.addPage();
  y = MARGIN;

  pdf.setFontSize(FONT_TITLE);
  pdf.text("サイクルノート", MARGIN, y);
  y += 2;
  pdf.setDrawColor(0);
  pdf.setLineWidth(0.5);
  pdf.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 6;

  const cycleHistory = buildCycleHistory(notes);

  for (const cycle of cycleHistory) {
    y = ensureSpace(pdf, y, 20);
    const boxStartY = y;
    y += BOX_PAD;

    pdf.setFontSize(FONT_H3);
    pdf.text(`サイクル ${cycle.cycleIndex + 1}`, MARGIN + BOX_PAD, y);
    y += 6;

    for (const field of cycle.fields) {
      y = ensureSpace(pdf, y, 12);
      pdf.setFontSize(FONT_NORMAL);
      pdf.text(field.label, MARGIN + BOX_PAD, y);
      y += LINE_H;

      if (field.history.length === 0) {
        pdf.setTextColor(120);
        pdf.text("（未記入）", MARGIN + BOX_PAD + 2, y);
        pdf.setTextColor(0);
        y += LINE_H;
      } else if (field.history.length === 1) {
        const diff = getLatestDiffStatus(notes, cycle.cycleIndex, field.key);
        if (diff === "new") {
          pdf.setFillColor(220, 252, 231);
          const lines = pdf.splitTextToSize(field.history[0].value, CONTENT_W - 8) as string[];
          pdf.rect(MARGIN + BOX_PAD, y - LINE_H + 1.5, CONTENT_W - BOX_PAD * 2, lines.length * LINE_H + 1, "F");
        }
        y = writeWrapped(pdf, field.history[0].value, MARGIN + BOX_PAD + 2, y, CONTENT_W - 8, LINE_H);
      } else {
        // Old values
        for (const h of field.history.slice(0, -1)) {
          pdf.setTextColor(160);
          pdf.setFontSize(FONT_SMALL);
          y = writeWrapped(pdf, `${h.value}（${h.date}）`, MARGIN + BOX_PAD + 2, y, CONTENT_W - 8, LINE_H * 0.9);
          pdf.setTextColor(0);
          pdf.setFontSize(FONT_NORMAL);
        }
        // Latest
        const latest = field.history[field.history.length - 1];
        const diff = getLatestDiffStatus(notes, cycle.cycleIndex, field.key);
        if (diff === "changed") {
          pdf.setFillColor(254, 249, 195);
          const lines = pdf.splitTextToSize(latest.value, CONTENT_W - 8) as string[];
          pdf.rect(MARGIN + BOX_PAD, y - LINE_H + 1.5, CONTENT_W - BOX_PAD * 2, lines.length * LINE_H + 1, "F");
        } else if (diff === "new") {
          pdf.setFillColor(220, 252, 231);
          const lines = pdf.splitTextToSize(latest.value, CONTENT_W - 8) as string[];
          pdf.rect(MARGIN + BOX_PAD, y - LINE_H + 1.5, CONTENT_W - BOX_PAD * 2, lines.length * LINE_H + 1, "F");
        }
        y = writeWrapped(pdf, latest.value, MARGIN + BOX_PAD + 2, y, CONTENT_W - 8, LINE_H);
      }
      y += 2;
    }

    y += BOX_PAD - 2; // bottom padding

    pdf.setDrawColor(160);
    pdf.roundedRect(MARGIN, boxStartY, CONTENT_W, y - boxStartY, 2, 2);
    y += 8;
  }

  /* ---------- 改ページ: JSON ---------- */
  pdf.addPage();
  y = MARGIN;

  pdf.setFontSize(FONT_TITLE);
  pdf.text("データバックアップ（JSON）", MARGIN, y);
  y += 2;
  pdf.setDrawColor(0);
  pdf.setLineWidth(0.5);
  pdf.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 6;

  pdf.setFontSize(6);
  pdf.setTextColor(100);
  pdf.text("以下の JSON をコピーしておくと、インポート機能でデータを復元できます。", MARGIN, y);
  y += 4;

  pdf.setFontSize(4);
  pdf.setTextColor(0);
  const jsonStr = JSON.stringify(notes, null, 2);
  y = writeWrapped(pdf, jsonStr, MARGIN, y, CONTENT_W, 2.2);

  return pdf.output("blob");
}

/** Generate a filename for the PDF based on current date. */
export function pdfFileName(notes: Note[]): string {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  return `探究ノート_${y}-${m}-${d}.pdf`;
}
