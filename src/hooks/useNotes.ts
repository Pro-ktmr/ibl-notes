"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Note,
  createEmptyReflection,
  createEmptyCycleTab,
  formatNoteTitle,
} from "@/types/note";

const STORAGE_KEY = "ibl-notes";
const USERNAME_KEY = "ibl-notes-username";

function loadNotes(): Note[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Note[]) : [];
  } catch {
    return [];
  }
}

function saveNotes(notes: Note[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [userName, setUserNameState] = useState("");

  useEffect(() => {
    setNotes(loadNotes());
    if (typeof window !== "undefined") {
      setUserNameState(localStorage.getItem(USERNAME_KEY) ?? "");
    }
    setLoaded(true);
  }, []);

  const setUserName = useCallback((name: string) => {
    setUserNameState(name);
    localStorage.setItem(USERNAME_KEY, name);
  }, []);

  useEffect(() => {
    if (loaded) {
      saveNotes(notes);
    }
  }, [notes, loaded]);

  const addNote = useCallback(
    (date: string): { success: boolean; error?: string } => {
      const exists = notes.some((n) => n.date === date);
      if (exists) {
        return { success: false, error: "同じ日付のノートが既に存在します" };
      }

      // Find most recent existing note for cycle tab cloning
      const sorted = [...notes].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      const latestNote = sorted[0];

      const newNote: Note = {
        id: crypto.randomUUID(),
        date,
        title: formatNoteTitle(date),
        reflection: createEmptyReflection(),
        cycleTabs:
          latestNote && latestNote.cycleTabs.length > 0
            ? latestNote.cycleTabs.map((tab) => ({ ...tab }))
            : [createEmptyCycleTab()],
      };

      setNotes((prev) =>
        [...prev, newNote].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        )
      );
      return { success: true };
    },
    [notes]
  );

  const updateNote = useCallback((id: string, updater: (note: Note) => Note) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? updater(n) : n))
    );
  }, []);

  const deleteNote = useCallback((id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const getNoteById = useCallback(
    (id: string): Note | undefined => {
      return notes.find((n) => n.id === id);
    },
    [notes]
  );

  const getPreviousNote = useCallback(
    (date: string): Note | undefined => {
      const sorted = [...notes].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      const idx = sorted.findIndex((n) => n.date === date);
      if (idx === -1 || idx === sorted.length - 1) return undefined;
      return sorted[idx + 1];
    },
    [notes]
  );

  const importNotes = useCallback((json: string): { success: boolean; error?: string } => {
    try {
      const parsed = JSON.parse(json) as Note[];
      if (!Array.isArray(parsed)) {
        return { success: false, error: "データが配列ではありません" };
      }
      const sorted = parsed.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setNotes(sorted);
      return { success: true };
    } catch {
      return { success: false, error: "JSONの解析に失敗しました" };
    }
  }, []);

  return {
    notes,
    loaded,
    userName,
    setUserName,
    addNote,
    updateNote,
    deleteNote,
    getNoteById,
    getPreviousNote,
    importNotes,
  };
}
