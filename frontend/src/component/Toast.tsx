"use client";

import { Toaster, toast } from "react-hot-toast";

export function ToastContainer() {
  return (
    <Toaster
      position="top-right"
      reverseOrder={false}
      gutter={12}
      containerStyle={{
        top: 80,
        right: 20,
      }}
      toastOptions={{
        // Default options
        duration: 4000,
        style: {
          background: "linear-gradient(135deg, #0B1445 0%, #0a1529 100%)",
          color: "#fff",
          borderRadius: "16px",
          border: "1px solid rgba(255, 59, 59, 0.2)",
          padding: "16px",
          boxShadow: "0 10px 40px rgba(0, 0, 0, 0.5)",
          backdropFilter: "blur(10px)",
          maxWidth: "400px",
        },
        // Success toast
        success: {
          duration: 3000,
          style: {
            background: "linear-gradient(135deg, #0B1445 0%, #0a1529 100%)",
            border: "1px solid rgba(34, 197, 94, 0.3)",
          },
          iconTheme: {
            primary: "#22c55e",
            secondary: "#fff",
          },
        },
        // Error toast
        error: {
          duration: 4000,
          style: {
            background: "linear-gradient(135deg, #0B1445 0%, #0a1529 100%)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
          },
          iconTheme: {
            primary: "#ef4444",
            secondary: "#fff",
          },
        },
        // Loading toast
        loading: {
          style: {
            background: "linear-gradient(135deg, #0B1445 0%, #0a1529 100%)",
            border: "1px solid rgba(59, 130, 246, 0.3)",
          },
          iconTheme: {
            primary: "#3b82f6",
            secondary: "#fff",
          },
        },
      }}
    />
  );
}

// ========== Custom Toast Functions ==========

// Success Toast
export const showSuccessToast = (message: string, title?: string) => {
  toast.success(
    (t) => (
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
          <svg
            className="w-5 h-5 text-green-500"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          {title && <p className="font-bold text-sm mb-1">{title}</p>}
          <p className="text-sm text-gray-300">{message}</p>
        </div>
        <button
          onClick={() => toast.dismiss(t.id)}
          className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    ),
    {
      duration: 3000,
    }
  );
};

// Error Toast
export const showErrorToast = (message: string, title?: string) => {
  toast.error(
    (t) => (
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
          <svg
            className="w-5 h-5 text-red-500"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          {title && <p className="font-bold text-sm mb-1">{title}</p>}
          <p className="text-sm text-gray-300">{message}</p>
        </div>
        <button
          onClick={() => toast.dismiss(t.id)}
          className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    ),
    {
      duration: 4000,
    }
  );
};

// Warning Toast
export const showWarningToast = (message: string, title?: string) => {
  toast(
    (t) => (
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center">
          <svg
            className="w-5 h-5 text-yellow-500"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          {title && <p className="font-bold text-sm mb-1">{title}</p>}
          <p className="text-sm text-gray-300">{message}</p>
        </div>
        <button
          onClick={() => toast.dismiss(t.id)}
          className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    ),
    {
      icon: "⚠️",
      duration: 4000,
      style: {
        background: "linear-gradient(135deg, #0B1445 0%, #0a1529 100%)",
        border: "1px solid rgba(234, 179, 8, 0.3)",
      },
    }
  );
};

// Info Toast
export const showInfoToast = (message: string, title?: string) => {
  toast(
    (t) => (
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
          <svg
            className="w-5 h-5 text-blue-500"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          {title && <p className="font-bold text-sm mb-1">{title}</p>}
          <p className="text-sm text-gray-300">{message}</p>
        </div>
        <button
          onClick={() => toast.dismiss(t.id)}
          className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    ),
    {
      icon: "ℹ️",
      duration: 3500,
      style: {
        background: "linear-gradient(135deg, #0B1445 0%, #0a1529 100%)",
        border: "1px solid rgba(59, 130, 246, 0.3)",
      },
    }
  );
};

// Loading Toast (Promise-based)
export const showLoadingToast = async <T,>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string;
    error: string;
  }
): Promise<T> => {
  return toast.promise(
    promise,
    {
      loading: messages.loading,
      success: messages.success,
      error: messages.error,
    },
    {
      style: {
        background: "linear-gradient(135deg, #0B1445 0%, #0a1529 100%)",
        border: "1px solid rgba(255, 59, 59, 0.2)",
      },
    }
  );
};

// Custom Toast with Action Button
export const showActionToast = (
  message: string,
  actionLabel: string,
  onAction: () => void,
  title?: string
) => {
  toast(
    (t) => (
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
            <svg
              className="w-5 h-5 text-purple-500"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            {title && <p className="font-bold text-sm mb-1">{title}</p>}
            <p className="text-sm text-gray-300">{message}</p>
          </div>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        <button
          onClick={() => {
            onAction();
            toast.dismiss(t.id);
          }}
          className="w-full bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white text-sm font-semibold py-2 px-4 rounded-lg transition-all duration-300"
        >
          {actionLabel}
        </button>
      </div>
    ),
    {
      duration: 6000,
      style: {
        background: "linear-gradient(135deg, #0B1445 0%, #0a1529 100%)",
        border: "1px solid rgba(168, 85, 247, 0.3)",
      },
    }
  );
};

// Transaction Toast (Blockchain specific)
export const showTransactionToast = (
  txId: string,
  status: "pending" | "success" | "failed",
  explorerUrl?: string
) => {
  const messages = {
    pending: "Transaction pending...",
    success: "Transaction confirmed!",
    failed: "Transaction failed",
  };

  const icons = {
    pending: "⏳",
    success: "✅",
    failed: "❌",
  };

  toast(
    (t) => (
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div
            className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
              status === "success"
                ? "bg-green-500/20"
                : status === "failed"
                ? "bg-red-500/20"
                : "bg-blue-500/20"
            }`}
          >
            <span className="text-lg">{icons[status]}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm mb-1">{messages[status]}</p>
            <p className="text-xs text-gray-400 font-mono truncate">
              {txId.slice(0, 8)}...{txId.slice(-8)}
            </p>
          </div>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        {explorerUrl && (
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white text-sm font-semibold py-2 px-4 rounded-lg transition-all duration-300 text-center"
          >
            View on Explorer →
          </a>
        )}
      </div>
    ),
    {
      duration: status === "pending" ? Infinity : 5000,
      style: {
        background: "linear-gradient(135deg, #0B1445 0%, #0a1529 100%)",
        border:
          status === "success"
            ? "1px solid rgba(34, 197, 94, 0.3)"
            : status === "failed"
            ? "1px solid rgba(239, 68, 68, 0.3)"
            : "1px solid rgba(59, 130, 246, 0.3)",
      },
    }
  );

  return txId;
};

export const dismissToast = (toastId: string) => {
  toast.dismiss(toastId);
};
