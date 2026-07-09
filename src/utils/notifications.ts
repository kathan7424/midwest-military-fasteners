/**
 * File Name: notifications.ts
 * Description: Toast and confirm dialog helpers (Sonner + SweetAlert2).
 * Developer: KP-184
 * Created Date: 2026-07-06
 * Last Modified: 2026-07-07
 */

import { toast } from "sonner";
import Swal from "sweetalert2";

import { formatNoticeMessage } from "@/utils/text.utils";

export interface NotifyAction {
  label: string;
  href: string;
}

/**
 * Reusing the message as the toast id replaces an existing toast instead of
 * stacking duplicates (e.g. repeated "Only 4 in stock" on every "+" click).
 */
export function notifySuccess(message: string, action?: NotifyAction) {
  const text = formatNoticeMessage(message);

  toast.success(text, {
    id: `success:${text}`,
    action: action
      ? {
          label: action.label,
          onClick: () => {
            window.location.href = action.href;
          },
        }
      : undefined,
  });
}

export function notifyError(message: string) {
  const text = formatNoticeMessage(message);
  toast.error(text, { id: `error:${text}` });
}

export function notifyWarning(message: string) {
  const text = formatNoticeMessage(message);
  toast.warning(text, { id: `warning:${text}` });
}

export function notifyInfo(message: string) {
  const text = formatNoticeMessage(message);
  toast.info(text, { id: `info:${text}` });
}

export function notifyLoading(message: string) {
  return toast.loading(message);
}

export function dismissToast(toastId: string | number) {
  toast.dismiss(toastId);
}

/**
 * Confirm destructive cart actions with SweetAlert2.
 */
export async function confirmRemoveItem(itemLabel: string): Promise<boolean> {
  const result = await Swal.fire({
    title: "Remove item?",
    text: `Remove ${itemLabel} from your order?`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Remove",
    cancelButtonText: "Cancel",
    reverseButtons: true,
    focusCancel: true,
    customClass: {
      popup: "rounded-xl",
      title: "text-near-black",
      confirmButton:
        "bg-blue text-white px-5 py-2 rounded-md font-semibold hover:bg-navy",
      cancelButton:
        "bg-white text-near-black border border-light-gray px-5 py-2 rounded-md font-semibold hover:bg-off-white",
    },
    buttonsStyling: false,
  });

  return result.isConfirmed;
}
