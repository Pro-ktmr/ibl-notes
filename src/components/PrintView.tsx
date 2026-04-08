"use client";

import { Note, CycleTab, LikertValue } from "@/types/note";

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

/** Build a history of cycle tab values across all notes (oldest first). */
function buildCycleHistory(notes: Note[]) {
  // notes are sorted newest-first; reverse for chronological order
  const chronological = [...notes].reverse();

  // Find max cycle count across all notes
  const maxCycles = Math.max(...chronological.map((n) => n.cycleTabs.length), 0);

  const cycles: {
    cycleIndex: number;
    fields: {
      key: keyof CycleTab;
      label: string;
      history: { date: string; value: string }[];
    }[];
  }[] = [];

  for (let ci = 0; ci < maxCycles; ci++) {
    const fields = CYCLE_FIELDS.map((f) => {
      const history: { date: string; value: string }[] = [];
      for (const note of chronological) {
        const tab = note.cycleTabs[ci];
        if (!tab) continue;
        const val = tab[f.key].trim();
        if (val === "") continue;
        // Only add if different from last recorded value
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

/** Check if a field in the latest note is new or changed compared to previous note */
function getLatestDiffStatus(
  notes: Note[],
  cycleIndex: number,
  fieldKey: keyof CycleTab
): "new" | "changed" | "same" {
  if (notes.length === 0) return "same";
  const latestNote = notes[0];
  const latestTab = latestNote.cycleTabs[cycleIndex];
  if (!latestTab) return "same";
  const currentValue = latestTab[fieldKey].trim();
  if (currentValue === "") return "same";

  // Find the previous note (second in the sorted array)
  const prevNote = notes.length > 1 ? notes[1] : undefined;
  if (!prevNote) return "new";
  const prevTab = prevNote.cycleTabs[cycleIndex];
  if (!prevTab) return "new";
  const prevValue = prevTab[fieldKey].trim();
  if (prevValue === "" && currentValue !== "") return "new";
  if (prevValue !== "" && currentValue !== "" && prevValue !== currentValue) return "changed";
  return "same";
}

interface Props {
  notes: Note[];
}

export function PrintView({ notes }: Props) {
  const cycleHistory = buildCycleHistory(notes);

  return (
    <div className="print-view hidden print:block" style={{ fontSize: "14px", color: "#000", backgroundColor: "#fff", fontFamily: "sans-serif", lineHeight: 1.6 }}>
      {/* ===== 前半: 今日の振り返り ===== */}
      <h2 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "16px", borderBottom: "2px solid #000", paddingBottom: "4px" }}>
        今日の振り返り
      </h2>

      {notes.map((note) => (
        <div
          key={note.id}
          className="print-no-break"
          style={{ marginBottom: "16px", border: "1px solid #9ca3af", borderRadius: "6px", padding: "12px" }}
        >
          <h3 style={{ fontWeight: "bold", fontSize: "16px", marginBottom: "8px" }}>{note.title}（{note.date}）</h3>

          <div style={{ marginBottom: "8px" }}>
            <span style={{ fontWeight: 600 }}>今日の活動内容：</span>
            <span style={{ whiteSpace: "pre-wrap" }}>{note.reflection.whatDidToday || "（未記入）"}</span>
          </div>

          <div style={{ marginBottom: "8px" }}>
            <span style={{ fontWeight: 600 }}>実施した段階：</span>
            {note.reflection.stages.length > 0
              ? note.reflection.stages.map((s) => STAGE_LABELS[s] || s).join("、")
              : "（未選択）"}
          </div>

          <div style={{ marginBottom: "4px" }}>
            <span style={{ fontWeight: 600 }}>楽しかった：</span>
            {likertText(note.reflection.enjoyment)}
          </div>
          <div style={{ marginBottom: "4px" }}>
            <span style={{ fontWeight: 600 }}>学びがあった：</span>
            {likertText(note.reflection.learning)}
          </div>
          <div>
            <span style={{ fontWeight: 600 }}>将来のためになる：</span>
            {likertText(note.reflection.future)}
          </div>
        </div>
      ))}

      {/* 強制改ページ */}
      <div className="print-page-break" />

      {/* ===== 後半: サイクルノート ===== */}
      <h2 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "16px", borderBottom: "2px solid #000", paddingBottom: "4px" }}>
        サイクルノート
      </h2>

      {cycleHistory.map((cycle) => (
        <div key={cycle.cycleIndex} className="print-no-break" style={{ marginBottom: "24px", border: "1px solid #9ca3af", borderRadius: "6px", padding: "12px" }}>
          <h3 style={{ fontWeight: "bold", fontSize: "16px", marginBottom: "12px" }}>
            サイクル {cycle.cycleIndex + 1}
          </h3>

          {cycle.fields.map((field) => {
            const diffStatus = getLatestDiffStatus(notes, cycle.cycleIndex, field.key);
            return (
              <div key={field.key} style={{ marginBottom: "12px" }}>
                <p style={{ fontWeight: 600, fontSize: "14px", marginBottom: "4px" }}>{field.label}</p>
                {field.history.length === 0 ? (
                  <p style={{ color: "#6b7280" }}>（未記入）</p>
                ) : field.history.length === 1 ? (
                  <p
                    style={{
                      whiteSpace: "pre-wrap",
                      padding: "0 4px",
                      backgroundColor: diffStatus === "new" ? "#dcfce7" : undefined,
                    }}
                  >
                    {field.history[0].value}
                  </p>
                ) : (
                  <div>
                    {/* Old values with strikethrough */}
                    {field.history.slice(0, -1).map((h, i) => (
                      <p
                        key={i}
                        style={{ color: "#9ca3af", padding: "0 4px" }}
                      >
                        <span style={{ textDecoration: "line-through", whiteSpace: "pre-wrap" }}>{h.value}</span>
                        <span style={{ fontSize: "12px", marginLeft: "4px" }}>（{h.date}）</span>
                      </p>
                    ))}
                    {/* Latest value */}
                    <p
                      style={{
                        whiteSpace: "pre-wrap",
                        padding: "0 4px",
                        backgroundColor:
                          diffStatus === "changed"
                            ? "#fef9c3"
                            : diffStatus === "new"
                            ? "#dcfce7"
                            : undefined,
                      }}
                    >
                      {field.history[field.history.length - 1].value}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {/* 強制改ページ */}
      <div className="print-page-break" />

      {/* ===== JSON ダンプ ===== */}
      <h2 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "16px", borderBottom: "2px solid #000", paddingBottom: "4px" }}>
        データバックアップ（JSON）
      </h2>
      <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "8px" }}>
        以下の JSON をコピーしておくと、インポート機能でデータを復元できます。
      </p>
      <pre style={{ fontSize: "6px", lineHeight: 1.2, whiteSpace: "pre-wrap", wordBreak: "break-all", fontFamily: "monospace", border: "1px solid #d1d5db", padding: "8px", borderRadius: "4px" }}>
        {JSON.stringify(notes, null, 2)}
      </pre>
    </div>
  );
}
