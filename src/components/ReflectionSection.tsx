"use client";

import { Reflection, Stage, LikertValue } from "@/types/note";

const STAGES: { value: Stage; label: string }[] = [
  { value: "課題の設定", label: "①課題の設定" },
  { value: "課題解決の過程", label: "②課題解決の過程" },
  { value: "分析・考察・推論", label: "③分析・考察・推論" },
  { value: "表現・伝達", label: "④表現・伝達" },
];

const LIKERT_OPTIONS: { value: LikertValue; label: string }[] = [
  { value: 4, label: "とてもそう思う" },
  { value: 3, label: "ややそう思う" },
  { value: 2, label: "あまりそう思わない" },
  { value: 1, label: "そう思わない" },
];

const LIKERT_QUESTIONS: { key: keyof Pick<Reflection, "enjoyment" | "learning" | "future">; label: string }[] = [
  { key: "enjoyment", label: "今日の探究活動に興味を持って取り組めた" },
  { key: "learning", label: "今日の探究活動で学び（新たな気づきや身につけたスキルなど）があった" },
  { key: "future", label: "今日の探究活動は将来自分のためになると思う" },
];

interface Props {
  reflection: Reflection;
  onChange: (reflection: Reflection) => void;
}

export function ReflectionSection({ reflection, onChange }: Props) {
  const update = (partial: Partial<Reflection>) =>
    onChange({ ...reflection, ...partial });

  const toggleStage = (stage: Stage) => {
    const stages = reflection.stages.includes(stage)
      ? reflection.stages.filter((s) => s !== stage)
      : [...reflection.stages, stage];
    update({ stages });
  };

  return (
    <section className="bg-white shadow rounded-lg p-6 space-y-6">
      <h3 className="text-base font-semibold text-gray-800 border-b pb-2">
        今日の振り返り
      </h3>

      {/* 今日の活動内容 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          今日の活動内容
        </label>
        <textarea
          value={reflection.whatDidToday}
          onChange={(e) => update({ whatDidToday: e.target.value })}
          rows={4}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-y"
          placeholder="今日の活動内容を記入してください"
        />
      </div>

      {/* 段階チェックボックス */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">
          今日実施したのはどの段階ですか？（複数回答可）
        </p>
        <div className="flex flex-wrap gap-4">
          {STAGES.map((s) => (
            <label
              key={s.value}
              className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={reflection.stages.includes(s.value)}
                onChange={() => toggleStage(s.value)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-400"
              />
              {s.label}
            </label>
          ))}
        </div>
      </div>

      {/* 4件法 */}
      {LIKERT_QUESTIONS.map((q) => (
        <div key={q.key}>
          <p className="text-sm font-medium text-gray-700 mb-2">{q.label}</p>
          <div className="flex flex-wrap gap-4">
            {LIKERT_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"
              >
                <input
                  type="radio"
                  name={q.key}
                  checked={reflection[q.key] === opt.value}
                  onChange={() => update({ [q.key]: opt.value })}
                  className="border-gray-300 text-blue-600 focus:ring-blue-400"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
