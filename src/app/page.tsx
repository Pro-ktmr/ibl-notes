"use client";

import { useState } from "react";
import Link from "next/link";
import { useNotesContext } from "@/contexts/NotesContext";
import { PrintView } from "@/components/PrintView";

function todayString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function HomePage() {
  const { notes, loaded, addNote, importNotes } = useNotesContext();
  const [date, setDate] = useState(todayString);
  const [error, setError] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [importJson, setImportJson] = useState("");
  const [importError, setImportError] = useState("");

  const handleAdd = () => {
    setError("");
    const result = addNote(date);
    if (!result.success) {
      setError(result.error ?? "エラーが発生しました");
    }
  };

  if (!loaded) {
    return <p className="text-gray-500">読み込み中...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">ノート一覧</h2>
        {notes.length > 0 && (
          <button
            onClick={() => window.print()}
            className="bg-gray-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-gray-700 transition-colors cursor-pointer print:hidden"
          >
            印刷
          </button>
        )}
      </div>

      {notes.length === 0 ? (
        <p className="text-gray-500">ノートがまだありません。下から追加してください。</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse bg-white shadow rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-blue-50 text-left text-sm text-gray-600">
                <th className="px-4 py-3 font-medium">日付</th>
                <th className="px-4 py-3 font-medium">タイトル</th>
                <th className="px-4 py-3 font-medium">サイクル数</th>
              </tr>
            </thead>
            <tbody>
              {notes.map((note) => (
                <tr
                  key={note.id}
                  className="border-t border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {note.date}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/notes/${note.id}`}
                      className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                    >
                      {note.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {note.cycleTabs.length}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-white shadow rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          ノートを追加
        </h3>
        <div className="flex items-end gap-3">
          <div>
            <label
              htmlFor="note-date"
              className="block text-xs text-gray-500 mb-1"
            >
              日付
            </label>
            <input
              id="note-date"
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setError("");
              }}
              className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <button
            onClick={handleAdd}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 transition-colors cursor-pointer"
          >
            追加
          </button>
        </div>
        {error && (
          <p className="mt-2 text-sm text-red-600">{error}</p>
        )}
      </div>

      <div className="bg-white shadow rounded-lg p-4 print:hidden">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">
            データのインポート
          </h3>
          <button
            onClick={() => {
              setShowImport(!showImport);
              setImportError("");
            }}
            className="text-sm text-blue-600 hover:underline cursor-pointer"
          >
            {showImport ? "閉じる" : "インポート"}
          </button>
        </div>
        {showImport && (
          <div className="space-y-2">
            <textarea
              value={importJson}
              onChange={(e) => {
                setImportJson(e.target.value);
                setImportError("");
              }}
              rows={6}
              className="w-full border border-gray-300 rounded px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-400 resize-y"
              placeholder="印刷ページの JSON をここに貼り付けてください..."
            />
            <button
              onClick={() => {
                const result = importNotes(importJson);
                if (result.success) {
                  setImportJson("");
                  setShowImport(false);
                  setImportError("");
                } else {
                  setImportError(result.error ?? "インポートに失敗しました");
                }
              }}
              className="bg-orange-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-orange-700 transition-colors cursor-pointer"
            >
              復元する
            </button>
            {importError && (
              <p className="text-sm text-red-600">{importError}</p>
            )}
            <p className="text-xs text-gray-400">
              ※ インポートすると現在のデータは上書きされます
            </p>
          </div>
        )}
      </div>

      <PrintView notes={notes} />
    </div>
  );
}
