"use client";

import { useState } from "react";

import { Button } from "@/components/base/buttons/button";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

type ConfirmResolver = (value: boolean) => void;

let openConfirmDialog: ((options: ConfirmOptions) => Promise<boolean>) | null =
  null;

export function requestConfirm(options: ConfirmOptions): Promise<boolean> {
  if (!openConfirmDialog) {
    return Promise.resolve(false);
  }

  return openConfirmDialog(options);
}

export default function ConfirmDialogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [resolver, setResolver] = useState<ConfirmResolver | null>(null);

  openConfirmDialog = (nextOptions) =>
    new Promise<boolean>((resolve) => {
      setOptions(nextOptions);
      setResolver(() => resolve);
      setIsOpen(true);
    });

  const closeWith = (value: boolean) => {
    setIsOpen(false);
    resolver?.(value);
    setResolver(null);
    setOptions(null);
  };

  return (
    <>
      {children}

      <ModalOverlay
        isOpen={isOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeWith(false);
          }
        }}
        isDismissable
      >
        <Modal className="max-w-md">
          <Dialog>
            <div className="p-6">
              <h2 className="text-lg font-semibold text-primary">
                {options?.title}
              </h2>
              <p className="mt-2 text-sm text-secondary">{options?.message}</p>

              <div className="mt-6 flex justify-end gap-3">
                <Button
                  color="secondary"
                  size="md"
                  onClick={() => closeWith(false)}
                >
                  {options?.cancelLabel || "Cancel"}
                </Button>
                <Button color="primary" size="md" onClick={() => closeWith(true)}>
                  {options?.confirmLabel || "Confirm"}
                </Button>
              </div>
            </div>
          </Dialog>
        </Modal>
      </ModalOverlay>
    </>
  );
}
