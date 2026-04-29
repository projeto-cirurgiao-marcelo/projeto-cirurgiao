"use client";

import * as React from "react";
import { Check, Circle, Play } from "lucide-react";
import { cn } from "@/lib/utils";

export type LessonStatus = "done" | "active" | "watched" | "todo";

export interface SidebarLesson {
  id: string;
  title: string;
  status: LessonStatus;
  /** Duração formatada compacta (ex: "12m" ou "7:57") */
  duration?: string;
}

export interface SidebarModule {
  id: string;
  title: string;
  lessons: SidebarLesson[];
}

interface AtlasModuleSidebarProps {
  /** Caps em cima do título — ex: "Conteúdo do módulo" */
  metaLabel?: string;
  /** Título do panel — ex: "Módulo 01 — Técnicas de drenagem" */
  title: string;
  /** Etapa atual (0-100). Quando definido, renderiza barra horizontal full-width */
  progressPercent?: number;
  /** "01 / 05" — fração de aulas */
  lessonsProgress?: string;
  modules: SidebarModule[];
  /** ID da lição ativa pra marcar destaque */
  activeLessonId?: string;
  /** Callback ao clicar numa aula. Use router.push pra preservar SPA. */
  onLessonClick?: (moduleId: string, lessonId: string) => void;
  /** Slot opcional no rodapé (ex: AssessmentCTA) */
  footer?: React.ReactNode;
  /** Layout flush attached à grid (sem border externo, sem rounded) — usar quando ocupa coluna fixa do study area */
  flush?: boolean;
  /** Esconde o header interno (title/metaLabel/progress). Útil quando renderizado dentro de AtlasSheet que já tem header próprio. */
  hideHeader?: boolean;
  className?: string;
}

export function AtlasModuleSidebar({
  metaLabel = "Conteúdo do módulo",
  title,
  progressPercent,
  lessonsProgress,
  modules,
  activeLessonId,
  onLessonClick,
  footer,
  flush = false,
  hideHeader = false,
  className,
}: AtlasModuleSidebarProps) {
  return (
    <aside
      className={cn(
        "bg-atlas-surface flex flex-col overflow-hidden",
        flush
          ? "border-l border-atlas-line"
          : "border border-atlas-line rounded-md",
        className,
      )}
    >
      {!hideHeader && (
      <header className="px-5 pt-5 pb-4 border-b border-atlas-line">
        <div className="atlas-caps text-atlas-muted mb-1.5">{metaLabel}</div>
        <h3 className="font-serif text-base font-medium tracking-[-0.005em] leading-[1.25] text-atlas-ink line-clamp-2">
          {title}
        </h3>
        {progressPercent !== undefined && (
          <div className="mt-3.5">
            <div className="h-0.5 bg-atlas-line rounded-sm overflow-hidden relative">
              <div
                className="absolute left-0 top-0 h-full bg-atlas-primary"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            {lessonsProgress && (
              <div className="atlas-mono text-[10.5px] text-atlas-muted tracking-[0.04em] mt-1.5">
                {lessonsProgress}
              </div>
            )}
          </div>
        )}
      </header>
      )}

      <div className="flex-1 overflow-y-auto">
        {modules.map((mod, mi) => {
          const total = mod.lessons.length;
          return (
            <div
              key={mod.id}
              className="border-b border-atlas-line last:border-b-0"
            >
              <div className="flex items-center justify-between px-5 pt-4 pb-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-[10px] text-atlas-muted-2 tracking-[0.08em] uppercase">
                    M
                  </span>
                  <span className="text-atlas-muted-2">·</span>
                  <span className="font-mono text-[10px] text-atlas-muted-2 tracking-[0.08em]">
                    {String(mi + 1).padStart(2, "0")}
                  </span>
                  <span className="text-[13px] font-medium text-atlas-ink truncate ml-1">
                    {mod.title}
                  </span>
                </div>
                <span className="font-mono text-[10.5px] text-atlas-muted shrink-0 atlas-num">
                  {total}
                </span>
              </div>

              <ul className="px-2 pb-3 space-y-px">
                {mod.lessons.map((lesson, li) => (
                  <LessonRow
                    key={lesson.id}
                    index={li + 1}
                    lesson={lesson}
                    isActive={lesson.id === activeLessonId || lesson.status === "active"}
                    onClick={
                      lesson.id === activeLessonId || lesson.status === "active"
                        ? undefined
                        : () => onLessonClick?.(mod.id, lesson.id)
                    }
                  />
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {footer && (
        <div className="border-t border-atlas-line bg-atlas-surface-2">
          {footer}
        </div>
      )}
    </aside>
  );
}

function LessonRow({
  index,
  lesson,
  isActive,
  onClick,
}: {
  index: number;
  lesson: SidebarLesson;
  isActive: boolean;
  onClick?: () => void;
}) {
  const Icon =
    lesson.status === "done"
      ? Check
      : isActive
        ? Play
        : Circle;

  return (
    <li className="relative">
      <button
        type="button"
        disabled={isActive}
        onClick={onClick}
        className={cn(
          "w-full grid grid-cols-[24px_1fr_auto] gap-2.5 items-start",
          "px-3 py-2 rounded-sm text-left transition-colors duration-150",
          isActive && "bg-atlas-primary-soft cursor-default",
          !isActive && "hover:bg-atlas-surface-2",
        )}
      >
        {isActive && (
          <span className="absolute left-0 top-2 bottom-2 w-0.5 bg-atlas-primary rounded-sm" />
        )}
        <span
          className={cn(
            "font-mono text-[11px] text-center pt-0.5",
            lesson.status === "todo" && !isActive && "text-atlas-muted-2",
            lesson.status === "watched" && !isActive && "text-atlas-warn-deep",
            lesson.status === "done" && !isActive && "text-atlas-primary",
            isActive && "text-atlas-primary-2 font-semibold",
          )}
        >
          {String(index).padStart(2, "0")}
        </span>
        <span
          className={cn(
            "text-[13px] leading-[1.35] line-clamp-2",
            lesson.status === "todo" && !isActive && "text-atlas-ink-2",
            lesson.status === "done" && !isActive && "text-atlas-muted",
            lesson.status === "watched" && !isActive && "text-atlas-ink-2",
            isActive && "text-atlas-primary-2 font-medium",
          )}
        >
          {lesson.title}
        </span>
        <span className="flex items-center gap-1.5 pt-0.5 shrink-0">
          {lesson.duration && (
            <span className="font-mono text-[10.5px] text-atlas-muted-2 atlas-num">
              {lesson.duration}
            </span>
          )}
          <Icon
            className={cn(
              "size-3",
              lesson.status === "done" && "text-atlas-primary",
              isActive && "text-atlas-warn",
              lesson.status === "watched" && !isActive && "text-atlas-warn",
              lesson.status === "todo" && !isActive && "text-atlas-muted-2",
            )}
            strokeWidth={1.75}
            fill={isActive ? "currentColor" : "none"}
          />
        </span>
      </button>
    </li>
  );
}
