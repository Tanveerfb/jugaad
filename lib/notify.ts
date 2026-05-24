/**
 * Wrapper around Sonner `toast` that also logs every notification
 * to the persistent notificationStore so users can review them later.
 */
import { toast } from "sonner";
import type { ExternalToast } from "sonner";
import {
  useNotificationStore,
  type NotificationType,
} from "@/stores/notificationStore";

function log(type: NotificationType, message: string) {
  useNotificationStore.getState().addNotification({ type, message });
}

export const notify = {
  success: (message: string, data?: ExternalToast) => {
    log("success", message);
    return toast.success(message, data);
  },
  error: (message: string, data?: ExternalToast) => {
    log("error", message);
    return toast.error(message, data);
  },
  warning: (message: string, data?: ExternalToast) => {
    log("warning", message);
    return toast.warning(message, data);
  },
  info: (message: string, data?: ExternalToast) => {
    log("info", message);
    return toast.info(message, data);
  },
  /** Pass-through — loading toasts are transient and not worth logging. */
  loading: toast.loading.bind(toast),
  /** Pass-through dismiss. */
  dismiss: toast.dismiss.bind(toast),
};
