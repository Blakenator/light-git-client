import { create } from 'zustand';
import { PreCommitStatusModel } from '@light-git/shared';

export interface NotificationModel {
  id: string;
  message: string;
  title?: string;
  type: 'success' | 'warning' | 'error' | 'info';
  duration?: number;
  timestamp: number;
}

export interface ErrorModel {
  id: string;
  message: string;
  stack?: string;
  timestamp: number;
}

interface UiState {
  // Modal visibility states
  modals: { [key: string]: boolean };
  
  // Loading state
  isLoading: boolean;
  loadingMessage?: string;
  
  // Alerts/notifications
  alerts: NotificationModel[];
  
  // Errors
  errors: ErrorModel[];
  
  // CRLF warning
  crlfError: { start: string; end: string } | null;
  
  // Pre-commit status
  preCommitStatus: PreCommitStatusModel | null;
}

interface UiActions {
  // Modal actions
  showModal: (modalId: string) => void;
  hideModal: (modalId: string) => void;
  toggleModal: (modalId: string) => void;
  isModalVisible: (modalId: string) => boolean;
  
  // Loading actions
  setLoading: (loading: boolean, message?: string) => void;
  
  // Alert actions
  showAlert: (message: string, type: NotificationModel['type'], duration?: number) => void;
  addAlert: (message: string, type: NotificationModel['type'], duration?: number) => void;
  dismissAlert: (id: string) => void;
  clearAlerts: () => void;
  
  // Error actions
  showError: (message: string, stack?: string) => void;
  dismissError: (id: string) => void;
  clearErrors: () => void;
  dismissAllErrors: () => void;
  
  // CRLF error
  setCrlfError: (error: { start: string; end: string } | null) => void;
  
  // Pre-commit status
  setPreCommitStatus: (status: PreCommitStatusModel | null) => void;
}

let alertIdCounter = 0;
let errorIdCounter = 0;

export const useUiStore = create<UiState & UiActions>((set, get) => ({
  // Initial state
  modals: {},
  isLoading: false,
  loadingMessage: undefined,
  alerts: [],
  errors: [],
  crlfError: null,
  preCommitStatus: null,

  // Modal actions
  showModal: (modalId) => {
    set((state) => ({
      modals: { ...state.modals, [modalId]: true },
    }));
  },

  hideModal: (modalId) => {
    set((state) => ({
      modals: { ...state.modals, [modalId]: false },
    }));
  },

  toggleModal: (modalId) => {
    set((state) => ({
      modals: { ...state.modals, [modalId]: !state.modals[modalId] },
    }));
  },

  isModalVisible: (modalId) => {
    return get().modals[modalId] || false;
  },

  // Loading actions
  setLoading: (loading, message) => {
    set({ isLoading: loading, loadingMessage: message });
  },

  // Alert actions
  showAlert: (message, type, duration = 5000) => {
    const id = `alert-${++alertIdCounter}`;
    const alert: NotificationModel = {
      id,
      message,
      type,
      duration,
      timestamp: Date.now(),
    };

    set((state) => ({
      alerts: [...state.alerts, alert],
    }));

    // Auto-dismiss after duration
    if (duration > 0) {
      setTimeout(() => {
        get().dismissAlert(id);
      }, duration);
    }
  },

  // Alias for showAlert
  addAlert: (message, type, duration = 5000) => {
    get().showAlert(message, type, duration);
  },

  dismissAlert: (id) => {
    set((state) => ({
      alerts: state.alerts.filter((a) => a.id !== id),
    }));
  },

  clearAlerts: () => {
    set({ alerts: [] });
  },

  // Error actions
  showError: (message, stack) => {
    const id = `error-${++errorIdCounter}`;
    const error: ErrorModel = {
      id,
      message,
      stack,
      timestamp: Date.now(),
    };

    set((state) => ({
      errors: [...state.errors, error],
    }));
  },

  dismissError: (id) => {
    set((state) => ({
      errors: state.errors.filter((e) => e.id !== id),
    }));
  },

  clearErrors: () => {
    set({ errors: [] });
  },

  dismissAllErrors: () => {
    set({ errors: [] });
  },

  // CRLF error
  setCrlfError: (error) => {
    set({ crlfError: error });
  },

  // Pre-commit status
  setPreCommitStatus: (status) => {
    set({ preCommitStatus: status });
  },
}));
