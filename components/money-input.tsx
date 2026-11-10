"use client";

import { formatMoneyInput } from "@/lib/money-input";
import { flushSync } from "react-dom";

type Props = {
  id: string;
  value: string;
  onValueChange: (value: string) => void;
  required?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
};

export default function MoneyInput({ id, value, onValueChange, required, autoFocus, placeholder }: Props) {
  return <input
    id={id}
    type="text"
    inputMode="decimal"
    autoComplete="off"
    required={required}
    autoFocus={autoFocus}
    placeholder={placeholder}
    value={value}
    onKeyDown={(event) => {
      const input = event.currentTarget;
      const comma = input.value.indexOf(",");
      if (comma < 0 || input.selectionStart !== input.selectionEnd) return;
      if (event.key === "Backspace" && input.selectionStart === comma + 1) {
        event.preventDefault(); input.setSelectionRange(comma, comma);
      } else if (event.key === "Delete" && input.selectionStart === comma) {
        event.preventDefault(); input.setSelectionRange(comma + 1, comma + 1);
      }
    }}
    onChange={(event) => {
      const input = event.currentTarget;
      const raw = input.value;
      const cursor = input.selectionStart ?? raw.length;
      const comma = raw.indexOf(",");
      const digitsBeforeCursor = raw.slice(0, cursor).replace(/\D/g, "").length;
      const editingCents = comma >= 0 && cursor > comma;
      const formatted = formatMoneyInput(raw);
      if (!formatted) { onValueChange(""); return; }
      const newComma = formatted.indexOf(",");
      let position: number;
      if (editingCents) {
        position = Math.min(formatted.length, newComma + 1 + raw.slice(comma + 1, cursor).replace(/\D/g, "").length);
      } else {
        position = 0;
        let digits = 0;
        while (position < newComma && digits < digitsBeforeCursor) {
          if (/\d/.test(formatted[position])) digits++;
          position++;
        }
      }
      flushSync(() => onValueChange(formatted));
      input.setSelectionRange(position, position);
    }}
  />;
}
