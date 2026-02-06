import React, { useEffect } from 'react';
import { ToastContainer, toast, TypeOptions, Id } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useUiStore, NotificationModel } from '../../../stores';

// Map our notification types to react-toastify types
const getToastType = (type: NotificationModel['type']): TypeOptions => {
  switch (type) {
    case 'success':
      return 'success';
    case 'warning':
      return 'warning';
    case 'error':
      return 'error';
    case 'info':
      return 'info';
    default:
      return 'default';
  }
};

// Component that syncs our store alerts with react-toastify
const AlertSync: React.FC = () => {
  const alerts = useUiStore((state) => state.alerts);
  const dismissAlert = useUiStore((state) => state.dismissAlert);

  // Track which alerts have been shown
  const shownAlertsRef = React.useRef<Set<string>>(new Set());

  useEffect(() => {
    alerts.forEach((alert) => {
      if (!shownAlertsRef.current.has(alert.id)) {
        shownAlertsRef.current.add(alert.id);
        
        toast(alert.message, {
          type: getToastType(alert.type),
          toastId: alert.id,
          autoClose: alert.duration || 4000,
          pauseOnHover: true,
          closeOnClick: true,
          onClose: () => {
            dismissAlert(alert.id);
            shownAlertsRef.current.delete(alert.id);
          },
        });
      }
    });

    // Clean up alerts that were dismissed externally
    shownAlertsRef.current.forEach((id) => {
      if (!alerts.find((a) => a.id === id)) {
        toast.dismiss(id);
        shownAlertsRef.current.delete(id);
      }
    });
  }, [alerts, dismissAlert]);

  return null;
};

export const AlertToasts: React.FC = () => {
  return (
    <>
      <AlertSync />
      <ToastContainer
        position="top-right"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
    </>
  );
};

// Export a helper function to show toasts directly without going through the store
export const showToast = {
  success: (message: string) => toast.success(message),
  error: (message: string) => toast.error(message),
  warning: (message: string) => toast.warning(message),
  info: (message: string) => toast.info(message),
};

export default AlertToasts;
