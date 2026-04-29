"use client";

import * as React from "react";
import { Loader2, Save, X } from "lucide-react";
import { AtlasButton } from "@/components/atlas/primitives/AtlasButton";
import { cn } from "@/lib/utils";

interface AtlasNoteEditorProps {
  /** Timestamp formatado a anexar — só visualização, ex "0:38" */
  timestamp?: string;
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saving?: boolean;
  maxLength?: number;
  /** Modo compacto pra mobile / row inline */
  compact?: boolean;
  placeholder?: string;
  className?: string;
}

export function AtlasNoteEditor({
  timestamp,
  value,
  onChange,
  onSave,
  onCancel,
  saving = false,
  maxLength = 5000,
  compact = false,
  placeholder = "Digite sua anotação...",
  className,
}: AtlasNoteEditorProps) {
  return (
    <div
      className={cn(
        "rounded-sm border border-atlas-line bg-atlas-surface",
        compact ? "p-2.5" : "p-3.5",
        className,
      )}
    >
      {timestamp && (
        <div className="flex items-center gap-1.5 mb-2">
          <span className="atlas-caps text-atlas-muted">Anotando em</span>
          <span className="atlas-mono text-[11.5px] font-medium text-atlas-warn-deep">
            {timestamp}
          </span>
        </div>
      )}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className={cn(
          "w-full resize-none border border-atlas-line rounded-sm",
          "bg-atlas-bg text-[13.5px] text-atlas-ink leading-[1.55]",
          "outline-none focus:border-atlas-ink-2 transition-colors",
          "p-2.5",
          compact ? "min-h-[64px]" : "min-h-[88px]",
        )}
      />
      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 mt-2">
        <span className="atlas-mono text-[10.5px] text-atlas-muted-2 atlas-num">
          {value.length} / {maxLength}
        </span>
        <div className="flex gap-2 sm:gap-2 flex-wrap sm:flex-nowrap justify-end">
          <AtlasButton
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={saving}
          >
            <X strokeWidth={1.5} />
            Cancelar
          </AtlasButton>
          <AtlasButton
            variant="primary"
            size="sm"
            onClick={onSave}
            disabled={saving || !value.trim()}
          >
            {saving ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Save strokeWidth={1.5} />
            )}
            Salvar
          </AtlasButton>
        </div>
      </div>
    </div>
  );
}
