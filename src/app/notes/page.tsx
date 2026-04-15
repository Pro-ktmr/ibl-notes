"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useNotesContext } from "@/contexts/NotesContext";
import { ReflectionSection } from "@/components/ReflectionSection";
import { CycleNoteTabs } from "@/components/CycleNoteTabs";

function NoteDetail() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { getNoteById, updateNote, getPreviousNote, loaded } = useNotesContext();

  if (!loaded) {
    return <p className="text-gray-500">読み込み中...</p>;
  }

  if (!id) {
    return (
      <div className="space-y-4">
        <p className="text-red-600">ノートIDが指定されていません。</p>
        <Link href="/" className="text-blue-600 hover:underline text-sm">
          ◀ 一覧に戻る
        </Link>
      </div>
    );
  }

  const note = getNoteById(id);

  if (!note) {
    return (
      <div className="space-y-4">
        <p className="text-red-600">ノートが見つかりません。</p>
        <Link href="/" className="text-blue-600 hover:underline text-sm">
          ◀ 一覧に戻る
        </Link>
      </div>
    );
  }

  const previousNote = getPreviousNote(note.date);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/" className="text-blue-600 hover:underline text-sm">
          ◀ 一覧に戻る
        </Link>
        <h2 className="text-lg font-semibold text-gray-800">{note.title}</h2>
      </div>

      <ReflectionSection
        reflection={note.reflection}
        onChange={(reflection) =>
          updateNote(id, (n) => ({ ...n, reflection }))
        }
      />

      <CycleNoteTabs
        cycleTabs={note.cycleTabs}
        previousCycleTabs={previousNote?.cycleTabs}
        theme={note.theme ?? ""}
        onThemeChange={(theme) =>
          updateNote(id, (n) => ({ ...n, theme }))
        }
        onChange={(cycleTabs) =>
          updateNote(id, (n) => ({ ...n, cycleTabs }))
        }
      />
    </div>
  );
}

export default function NoteDetailPage() {
  return (
    <Suspense fallback={<p className="text-gray-500">読み込み中...</p>}>
      <NoteDetail />
    </Suspense>
  );
}
