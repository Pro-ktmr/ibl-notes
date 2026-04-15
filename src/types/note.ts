export type Stage = "課題の設定" | "課題解決の過程" | "分析・考察・推論" | "表現・伝達" | "わからない";

export type LikertValue = 4 | 3 | 2 | 1 | null;

export interface Reflection {
  whatDidToday: string;
  stages: Stage[];
  enjoyment: LikertValue;
  learning: LikertValue;
  future: LikertValue;
}

export type CycleTabTextField = "taskSetting" | "problemSolving" | "analysis" | "expression";

export interface CycleTab {
  taskSetting: string;       // ①課題の設定
  problemSolving: string;    // ②課題解決の過程
  analysis: string;          // ③分析・考察・推論
  expression: string;        // ④表現・伝達
  skippedFields?: Partial<Record<CycleTabTextField, boolean>>;
}

export interface Note {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  theme: string;
  reflection: Reflection;
  cycleTabs: CycleTab[];
}

export function createEmptyReflection(): Reflection {
  return {
    whatDidToday: "",
    stages: [],
    enjoyment: null,
    learning: null,
    future: null,
  };
}

export function createEmptyCycleTab(): CycleTab {
  return {
    taskSetting: "",
    problemSolving: "",
    analysis: "",
    expression: "",
  };
}

export function formatNoteTitle(date: string): string {
  const d = new Date(date + "T00:00:00");
  return `${d.getMonth() + 1}月${d.getDate()}日のノート`;
}

export function isCycleTabComplete(tab: CycleTab): boolean {
  const fields: CycleTabTextField[] = ["taskSetting", "problemSolving", "analysis", "expression"];
  return fields.every(
    (key) => tab[key].trim() !== "" || tab.skippedFields?.[key]
  );
}
