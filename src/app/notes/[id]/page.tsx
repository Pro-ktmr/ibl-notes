"use client";

import { use } from "react";
import Link from "next/link";
import { useNotesContext } from "@/contexts/NotesContext";
import { ReflectionSection } from "@/components/ReflectionSection";
import { CycleNoteTabs } from "@/components/CycleNoteTabs";

export default function NoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { getNoteById, updateNote, getPreviousNote, loaded } = useNotesContext();
  const note = getNoteById(id);

  if (!loaded) {
    return <p className="text-gray-500">読み込み中...</p>;
  }

  if (!note) {
    return (
      <div className="space-y-4">
        <p className="text-red-600">ノートが見つかりません。</p>
        <Link href="/" className="text-blue-600 hover:underline text-sm">
          ← 一覧に戻る
        </Link>
      </div>
    );
  }

  const previousNote = getPreviousNote(note.date);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/" className="text-blue-600 hover:underline text-sm">
          ← 一覧に戻る
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
        onChange={(cycleTabs) =>
          updateNote(id, (n) => ({ ...n, cycleTabs }))
        }
      />
    </div>
  );
}
