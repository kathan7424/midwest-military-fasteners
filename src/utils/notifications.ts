/**
 * File Name: notifications.ts
 * Description: Toast and confirm dialog helpers (Sonner + Untitled UI modal).
 * Developer: KP-184
 * Created Date: 2026-07-06
 * Last Modified: 2026-07-07
 */

import { toast } from "sonner";

import { requestConfirm } from "@/components/providers/ConfirmDialogProvider";

export function notifySuccess(message: string) {
  toast.success(message);
}

export function notifyError(message: string) {
  toast.error(message);
}

export function notifyLoading(message: string) {
  return toast.loading(message);
}

export function dismissToast(toastId: string | number) {
  toast.dismiss(toastId);
}

/**
 * Confirm destructive cart actions with Untitled UI modal.
 */
export async function confirmRemoveItem(itemLabel: string): Promise<boolean> {
  return requestConfirm({
    title: "Remove item?",
    message: `Remove ${itemLabel} from your order?`,
    confirmLabel: "Remove",
    cancelLabel: "Cancel",
  });
}
