import {
  useEffect,
  useRef,
  useState,
  type HTMLInputTypeAttribute,
} from "react";
import Input from "./form/input";

type EditableInfoFieldProps = {
  label: string;
  value: string;
  onSave: (value: string) => void;
  isSubmitting?: boolean;
  editLabel?: string;
  placeholder?: string;
  inputType?: HTMLInputTypeAttribute;
};

export default function EditableInfoField({
  label,
  value,
  onSave,
  isSubmitting = false,
  editLabel = "Edit",
  placeholder,
  inputType = "text",
}: EditableInfoFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftValue, setDraftValue] = useState(value);
  const wasSubmittingRef = useRef(isSubmitting);

  // Return to the display state once the parent's in-flight save resolves.
  useEffect(() => {
    if (wasSubmittingRef.current && !isSubmitting) {
      setIsEditing(false);
    }
    wasSubmittingRef.current = isSubmitting;
  }, [isSubmitting]);

  useEffect(() => {
    if (!isEditing) {
      setDraftValue(value);
    }
  }, [value, isEditing]);

  function handleEditClick() {
    setDraftValue(value);
    setIsEditing(true);
  }

  function handleCancelClick() {
    setDraftValue(value);
    setIsEditing(false);
  }

  function handleSaveClick() {
    const trimmedValue = draftValue.trim();

    if (!trimmedValue || trimmedValue === value) {
      setIsEditing(false);
      return;
    }

    onSave(trimmedValue);
  }

  return (
    <div className="py-4 first:pt-0 last:pb-0">
      <p className="text-xs font-medium text-slate-400">{label}</p>

      {isEditing ? (
        <div className="mt-1.5 flex items-center gap-3">
          <Input
            autoFocus
            type={inputType}
            value={draftValue}
            placeholder={placeholder}
            disabled={isSubmitting}
            onChange={(event) => setDraftValue(event.target.value)}
            containerClassName="flex-1"
            size="sm"
          />
          <button
            type="button"
            onClick={handleSaveClick}
            disabled={isSubmitting}
            className="shrink-0 text-sm font-semibold text-emerald-600 transition hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            onClick={handleCancelClick}
            disabled={isSubmitting}
            className="shrink-0 text-sm font-medium text-slate-400 transition hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="mt-1.5 flex items-center gap-3">
          <p className="text-sm font-semibold text-slate-900">{value}</p>
          <button
            type="button"
            onClick={handleEditClick}
            disabled={isSubmitting}
            className="shrink-0 text-sm font-semibold text-emerald-600 transition hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {editLabel}
          </button>
        </div>
      )}
    </div>
  );
}
