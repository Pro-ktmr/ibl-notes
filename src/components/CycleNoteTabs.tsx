"use client";

import { useState } from "react";
import { CycleTab, CycleTabTextField, createEmptyCycleTab, isCycleTabComplete } from "@/types/note";

const FIELDS: {
  key: CycleTabTextField;
  label: string;
  prompt: string;
}[] = [
  {
    key: "taskSetting",
    label: "①課題の設定",
    prompt: "どのような課題を設定しますか？",
  },
  {
    key: "problemSolving",
    label: "②課題解決の過程",
    prompt: "どのような手法を用いますか？",
  },
  {
    key: "analysis",
    label: "③分析・考察・推論",
    prompt: "どのような結果が得られましたか？",
  },
  {
    key: "expression",
    label: "④表現・伝達",
    prompt: "どのような内容を発表しますか？",
  },
];

type DiffStatus = "same" | "new" | "changed";

function getDiffStatus(
  currentValue: string,
  previousTab: CycleTab | undefined,
  fieldKey: CycleTabTextField
): DiffStatus {
  if (!previousTab) return currentValue.trim() ? "new" : "same";
  const prevValue = previousTab[fieldKey];
  if (prevValue.trim() === "" && currentValue.trim() !== "") return "new";
  if (prevValue.trim() !== "" && currentValue.trim() !== "" && prevValue !== currentValue) return "changed";
  return "same";
}

function diffBgClass(status: DiffStatus): string {
  switch (status) {
    case "new":
      return "bg-green-50 border-green-300";
    case "changed":
      return "bg-yellow-50 border-yellow-300";
    default:
      return "border-gray-300";
  }
}

interface Props {
  cycleTabs: CycleTab[];
  previousCycleTabs: CycleTab[] | undefined;
  theme: string;
  onThemeChange: (theme: string) => void;
  onChange: (tabs: CycleTab[]) => void;
}

export function CycleNoteTabs({ cycleTabs, previousCycleTabs, theme, onThemeChange, onChange }: Props) {
  const [activeTab, setActiveTab] = useState(Math.max(0, cycleTabs.length - 1));

  const canAddTab =
    cycleTabs.length > 0 && isCycleTabComplete(cycleTabs[cycleTabs.length - 1]);

  const isLastTabEmpty =
    cycleTabs.length > 1 &&
    activeTab === cycleTabs.length - 1 &&
    (["taskSetting", "problemSolving", "analysis", "expression"] as CycleTabTextField[]).every(
      (key) => cycleTabs[cycleTabs.length - 1][key].trim() === ""
    ) &&
    !Object.values(cycleTabs[cycleTabs.length - 1].skippedFields ?? {}).some(Boolean);

  const handleAddTab = () => {
    if (!canAddTab) return;
    onChange([...cycleTabs, createEmptyCycleTab()]);
    setActiveTab(cycleTabs.length);
  };

  const handleDeleteTab = () => {
    if (!isLastTabEmpty) return;
    const updated = cycleTabs.slice(0, -1);
    onChange(updated);
    setActiveTab(updated.length - 1);
  };

  const updateField = (tabIndex: number, key: CycleTabTextField, value: string) => {
    const updated = cycleTabs.map((tab, i) =>
      i === tabIndex ? { ...tab, [key]: value } : tab
    );
    onChange(updated);
  };

  const toggleSkip = (tabIndex: number, key: CycleTabTextField) => {
    const updated = cycleTabs.map((tab, i) => {
      if (i !== tabIndex) return tab;
      const skippedFields = { ...tab.skippedFields };
      skippedFields[key] = !skippedFields[key];
      return { ...tab, skippedFields };
    });
    onChange(updated);
  };

  const currentTab = cycleTabs[activeTab];
  const prevTab = previousCycleTabs?.[activeTab];

  if (!currentTab) return null;

  return (
    <section className="bg-white shadow rounded-lg p-6 space-y-4">
      <h3 className="text-base font-semibold text-gray-800 border-b pb-2">
        サイクルノート
      </h3>

      {/* テーマ */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          テーマ
        </label>
        <input
          type="text"
          value={theme}
          onChange={(e) => onThemeChange(e.target.value)}
          placeholder="全体的なテーマを書いてください"
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      {/* タブバー */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        {cycleTabs.map((_, i) => (
          <button
            key={i}
            onClick={() => setActiveTab(i)}
            className={`px-4 py-2 text-sm font-medium rounded-t transition-colors cursor-pointer ${
              i === activeTab
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            サイクル {i + 1}
          </button>
        ))}
        <button
          onClick={handleAddTab}
          disabled={!canAddTab}
          className={`px-3 py-2 text-sm font-medium rounded-t transition-colors cursor-pointer ${
            canAddTab
              ? "bg-green-100 text-green-700 hover:bg-green-200"
              : "bg-gray-50 text-gray-300 cursor-not-allowed"
          }`}
          title={canAddTab ? "新しいサイクルを追加" : "すべての欄を入力してから追加できます"}
        >
          ＋
        </button>
        {isLastTabEmpty && (
          <button
            onClick={handleDeleteTab}
            className="px-3 py-2 text-sm font-medium rounded-t bg-red-100 text-red-700 hover:bg-red-200 transition-colors cursor-pointer"
            title="未記入の最新サイクルを削除"
          >
            削除
          </button>
        )}
      </div>

      {/* 差分の凡例 */}
      {previousCycleTabs && (
        <div className="flex gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 bg-green-50 border border-green-300 rounded" />
            新規入力
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 bg-yellow-50 border border-yellow-300 rounded" />
            書き換え
          </span>
        </div>
      )}

      {/* フィールド */}
      <div className="space-y-4">
        {FIELDS.map((field) => {
          const status = getDiffStatus(currentTab[field.key], prevTab, field.key);
          const isSkipped = currentTab.skippedFields?.[field.key] ?? false;
          return (
            <div key={field.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.label}
              </label>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs text-gray-500">{field.prompt}</p>
                <label className="flex items-center gap-1 text-xs text-gray-500 whitespace-nowrap cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSkipped}
                    onChange={() => toggleSkip(activeTab, field.key)}
                    className="cursor-pointer"
                  />
                  空欄のままにする
                </label>
              </div>
              <textarea
                value={currentTab[field.key]}
                onChange={(e) =>
                  updateField(activeTab, field.key, e.target.value)
                }
                rows={3}
                disabled={isSkipped}
                className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-y ${diffBgClass(
                  status
                )} ${isSkipped ? "bg-gray-100 text-gray-400" : ""}`}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
