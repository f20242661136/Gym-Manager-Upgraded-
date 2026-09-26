import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';

export type FeedbackTone =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info';

export interface FeedbackMessage {
  id: number;
  tone: FeedbackTone;
  title: string;
  detail?: string;
  durationMs?: number;
}

interface FeedbackContextValue {
  message: FeedbackMessage | null;
  showFeedback: (
    input: Omit<FeedbackMessage, 'id'>
  ) => void;
  dismissFeedback: () => void;
}

const FeedbackContext =
  createContext<FeedbackContextValue | null>(
    null
  );

export const useFeedback = () => {
  const value =
    useContext(FeedbackContext);

  if (!value) {
    throw new Error(
      'useFeedback must be used inside FeedbackProvider'
    );
  }

  return value;
};

export const FeedbackProvider:
  React.FC<{
    children: React.ReactNode;
  }> = ({ children }) => {
  const [message, setMessage] =
    useState<FeedbackMessage | null>(
      null
    );

  const counter = useRef(0);

  const timer =
    useRef<ReturnType<
      typeof setTimeout
    > | null>(null);

  const dismissFeedback =
    useCallback(() => {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }

      setMessage(null);
    }, []);

  const showFeedback =
    useCallback(
      (
        input: Omit<
          FeedbackMessage,
          'id'
        >
      ) => {
        if (timer.current) {
          clearTimeout(timer.current);
        }

        counter.current += 1;

        const next: FeedbackMessage = {
          ...input,
          id: counter.current,
        };

        setMessage(next);

        timer.current =
          setTimeout(
            () => {
              setMessage(null);
              timer.current = null;
            },
            input.durationMs ??
              3200
          );
      },
      []
    );

  const value =
    useMemo(
      () => ({
        message,
        showFeedback,
        dismissFeedback,
      }),
      [
        dismissFeedback,
        message,
        showFeedback,
      ]
    );

  return (
    <FeedbackContext.Provider
      value={value}
    >
      {children}
    </FeedbackContext.Provider>
  );
};