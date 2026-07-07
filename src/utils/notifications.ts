/**
 * File Name: notifications.ts
 * Description: Toast and SweetAlert notification helpers.
 * Developer: KP-184
 * Created Date: 2026-07-06
 * Last Modified: 2026-07-06
 */

import toast from "react-hot-toast";
import Swal from "sweetalert2";

export function notifySuccess(message: string) {
  toast.success(message, {
    duration: 3000,
    position: "top-center",
  });
}

export function notifyError(message: string) {
  toast.error(message, {
    duration: 4000,
    position: "top-center",
  });
}

export function notifyLoading(message: string) {
  return toast.loading(message, {
    position: "top-center",
  });
}

export function dismissToast(toastId: string) {
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
    confirmButtonColor: "#c99700",
    cancelButtonColor: "#4f5965",
    reverseButtons: true,
    focusCancel: true,
  });

  return result.isConfirmed;
}
