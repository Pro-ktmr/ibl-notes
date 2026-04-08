"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useNotesContext } from "@/contexts/NotesContext";
import { PrintView } from "@/components/PrintView";
import { generatePdfBlob, pdfFileName } from "@/lib/generatePdf";
import {
  extractFolderId,
  loadGisScript,
  requestAccessToken,
  uploadToGoogleDrive,
} from "@/lib/googleDrive";

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

  // PDF & Google Drive state
  const [pdfBusy, setPdfBusy] = useState(false);
  const [driveFolderUrl, setDriveFolderUrl] = useState("");
  const [googleClientId, setGoogleClientId] = useState("");
  const [showDriveSettings, setShowDriveSettings] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [uploading, setUploading] = useState(false);

  // Load saved Google Drive settings from localStorage
  useEffect(() => {
    const savedUrl = localStorage.getItem("drive-folder-url");
    const savedClientId = localStorage.getItem("google-client-id");
    if (savedUrl) setDriveFolderUrl(savedUrl);
    if (savedClientId) setGoogleClientId(savedClientId);
  }, []);

  // Persist settings
  useEffect(() => {
    localStorage.setItem("drive-folder-url", driveFolderUrl);
  }, [driveFolderUrl]);
  useEffect(() => {
    localStorage.setItem("google-client-id", googleClientId);
  }, [googleClientId]);

  const handleDownloadPdf = useCallback(async () => {
    if (pdfBusy) return;
    setPdfBusy(true);
    try {
      const blob = await generatePdfBlob(notes);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = pdfFileName(notes);
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("PDF の生成に失敗しました");
    } finally {
      setPdfBusy(false);
    }
  }, [notes, pdfBusy]);

  const handleUploadToDrive = useCallback(async () => {
    setUploadStatus(null);

    const folderId = extractFolderId(driveFolderUrl);
    if (!folderId) {
      setUploadStatus({ type: "error", message: "Google Drive フォルダの URL が正しくありません" });
      return;
    }
    if (!googleClientId.trim()) {
      setUploadStatus({ type: "error", message: "Google Client ID を入力してください" });
      return;
    }

    setUploading(true);
    try {
      // 1. PDF を生成
      const blob = await generatePdfBlob(notes);

      // 2. Google 認証
      await loadGisScript();
      const accessToken = await requestAccessToken(googleClientId.trim());

      // 3. Google Drive にアップロード
      await uploadToGoogleDrive(blob, pdfFileName(notes), folderId, accessToken);

      setUploadStatus({ type: "success", message: "Google Drive にアップロードしました" });
    } catch (e) {
      console.error(e);
      setUploadStatus({ type: "error", message: e instanceof Error ? e.message : "アップロードに失敗しました" });
    } finally {
      setUploading(false);
    }
  }, [driveFolderUrl, googleClientId, notes]);

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
            onClick={handleDownloadPdf}
            disabled={pdfBusy}
            className="bg-gray-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-gray-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed print:hidden"
          >
            {pdfBusy ? "生成中..." : "PDF ダウンロード"}
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
                      href={`/notes?id=${note.id}`}
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

      {/* Google Drive 提出 */}
      {notes.length > 0 && (
        <div className="bg-white shadow rounded-lg p-4 print:hidden">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">
              Google Drive に提出
            </h3>
            <button
              onClick={() => {
                setShowDriveSettings(!showDriveSettings);
                setUploadStatus(null);
              }}
              className="text-sm text-blue-600 hover:underline cursor-pointer"
            >
              {showDriveSettings ? "閉じる" : "設定を表示"}
            </button>
          </div>

          {showDriveSettings && (
            <div className="space-y-3 mb-4">
              <div>
                <label htmlFor="drive-folder-url" className="block text-xs text-gray-500 mb-1">
                  Google Drive フォルダ URL
                </label>
                <input
                  id="drive-folder-url"
                  type="url"
                  value={driveFolderUrl}
                  onChange={(e) => setDriveFolderUrl(e.target.value)}
                  placeholder="https://drive.google.com/drive/folders/..."
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label htmlFor="google-client-id" className="block text-xs text-gray-500 mb-1">
                  Google OAuth Client ID
                </label>
                <input
                  id="google-client-id"
                  type="text"
                  value={googleClientId}
                  onChange={(e) => setGoogleClientId(e.target.value)}
                  placeholder="xxxx.apps.googleusercontent.com"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Google Cloud Console で作成した OAuth 2.0 クライアント ID を入力してください
                </p>
              </div>
            </div>
          )}

          <button
            onClick={handleUploadToDrive}
            disabled={uploading}
            className="bg-green-600 text-white px-5 py-2 rounded text-sm font-medium hover:bg-green-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? "アップロード中..." : "提出"}
          </button>

          {uploadStatus && (
            <p className={`mt-2 text-sm ${uploadStatus.type === "success" ? "text-green-600" : "text-red-600"}`}>
              {uploadStatus.message}
            </p>
          )}
        </div>
      )}

      <PrintView notes={notes} />
    </div>
  );
}
