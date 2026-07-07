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

export function notifySuccess(message: string) {
  toast.success(formatNoticeMessage(message));
}

export function notifyError(message: string) {
  toast.error(formatNoticeMessage(message));
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
