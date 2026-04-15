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
  userName?: string;
}

export function PrintView({ notes, userName }: Props) {
  const cycleHistory = buildCycleHistory(notes);

  return (
    <div className="print-view hidden print:block text-sm text-black bg-white">
      {userName && (
        <div className="print-header-name">{userName}</div>
      )}
      {/* ===== 前半: 今日の振り返り ===== */}
      <h2 className="text-lg font-bold mb-4 border-b-2 border-black pb-1">
        今日の振り返り
      </h2>

      {notes.map((note) => (
        <div
          key={note.id}
          className="mb-4 border border-gray-400 rounded p-3 print-no-break"
        >
          <h3 className="font-bold text-base mb-2">{note.title}（{note.date}）</h3>

          <div className="mb-2">
            <span className="font-semibold">今日の活動内容：</span>
            <span className="whitespace-pre-wrap">{note.reflection.whatDidToday || "（未記入）"}</span>
          </div>

          <div className="mb-2">
            <span className="font-semibold">実施した段階：</span>
            {note.reflection.stages.length > 0
              ? note.reflection.stages.map((s) => STAGE_LABELS[s] || s).join("、")
              : "（未選択）"}
          </div>

          <div className="mb-1">
            <span className="font-semibold">楽しかった：</span>
            {likertText(note.reflection.enjoyment)}
          </div>
          <div className="mb-1">
            <span className="font-semibold">学びがあった：</span>
            {likertText(note.reflection.learning)}
          </div>
          <div>
            <span className="font-semibold">将来のためになる：</span>
            {likertText(note.reflection.future)}
          </div>
        </div>
      ))}

      {/* 強制改ページ */}
      <div className="print-page-break" />

      {/* ===== 後半: サイクルノート ===== */}
      <h2 className="text-lg font-bold mb-4 border-b-2 border-black pb-1">
        サイクルノート
      </h2>

      {notes.length > 0 && notes[0].theme && (
        <div className="mb-4 print-no-break">
          <span className="font-semibold">テーマ：</span>
          <span>{notes[0].theme}</span>
        </div>
      )}

      {cycleHistory.map((cycle) => (
        <div key={cycle.cycleIndex} className="mb-6 border border-gray-400 rounded p-3 print-no-break">
          <h3 className="font-bold text-base mb-3">
            サイクル {cycle.cycleIndex + 1}
          </h3>

          {cycle.fields.map((field) => {
            const diffStatus = getLatestDiffStatus(notes, cycle.cycleIndex, field.key);
            return (
              <div key={field.key} className="mb-3">
                <p className="font-semibold text-sm mb-1">{field.label}</p>
                {field.history.length === 0 ? (
                  <p className="text-gray-500">（未記入）</p>
                ) : field.history.length === 1 ? (
                  <p
                    className={`whitespace-pre-wrap px-1 ${
                      diffStatus === "new"
                        ? "bg-green-100"
                        : ""
                    }`}
                  >
                    {field.history[0].value}
                  </p>
                ) : (
                  <div>
                    {/* Old values with strikethrough */}
                    {field.history.slice(0, -1).map((h, i) => (
                      <p
                        key={i}
                        className="text-gray-400 px-1"
                      >
                        <span className="line-through whitespace-pre-wrap">{h.value}</span>
                        <span className="text-xs ml-1">（{h.date}）</span>
                      </p>
                    ))}
                    {/* Latest value */}
                    <p
                      className={`whitespace-pre-wrap px-1 ${
                        diffStatus === "changed"
                          ? "bg-yellow-100"
                          : diffStatus === "new"
                          ? "bg-green-100"
                          : ""
                      }`}
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
      <h2 className="text-lg font-bold mb-4 border-b-2 border-black pb-1">
        データバックアップ（JSON）
      </h2>
      <p className="text-xs text-gray-500 mb-2">
        以下の JSON をコピーしておくと、インポート機能でデータを復元できます。
      </p>
      <pre className="text-[6px] leading-tight whitespace-pre-wrap break-all font-mono border border-gray-300 p-2 rounded">
        {JSON.stringify(notes, null, 2)}
      </pre>
    </div>
  );
}
