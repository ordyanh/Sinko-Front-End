import { useState, type ReactNode } from "react";
import {
  Description,
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { X } from "lucide-react";

export type ModalProps = {
  title: string;
  description?: string;
  isOpen: boolean;
  onClose?: () => void;
  size?: "sm" | "md" | "lg";
  children: ReactNode;
};

const sizeClasses: Record<NonNullable<ModalProps["size"]>, string> = {
  sm: "sm:max-w-md",
  md: "sm:max-w-2xl",
  lg: "sm:max-w-4xl",
};

export default function Modal({
  title,
  description,
  isOpen,
  onClose = () => {},
  size = "md",
  children,
}: ModalProps) {
  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-slate-950/45 backdrop-blur-[2px] transition duration-200 data-closed:opacity-0"
      />

      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-0 sm:items-center sm:p-6">
          <DialogPanel
            transition
            className={`relative flex w-full flex-col overflow-hidden border border-slate-200 bg-white shadow-2xl shadow-slate-900/15 transition duration-200 data-closed:translate-y-6 data-closed:opacity-0 sm:max-h-[min(85vh,48rem)] sm:rounded-[1.75rem] sm:data-closed:translate-y-0 sm:data-closed:scale-95 ${sizeClasses[size]} rounded-t-[1.75rem]`}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
              aria-label="Close dialog"
            >
              <X size={18} aria-hidden="true" />
            </button>

            <div className="border-b border-slate-200/80 bg-slate-50/80 px-5 pb-5 pt-6 sm:px-7 sm:pb-6 sm:pt-7">
              <DialogTitle className="pr-12 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                {title}
              </DialogTitle>

              {description ? (
                <Description className="mt-2 max-w-2xl pr-12 text-sm leading-6 text-slate-600 sm:text-[0.95rem]">
                  {description}
                </Description>
              ) : null}
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
              {children}
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}

export const useModalState = () => {
  const [isOpen, setIsOpen] = useState(false);

  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);

  return {
    isOpen,
    openModal,
    closeModal,
  };
};
