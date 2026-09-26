import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

interface SidePanelContextValue {
  isOpen: boolean;
  openPanel: () => void;
  closePanel: () => void;
}

const SidePanelContext =
  createContext<
    SidePanelContextValue | null
  >(null);

export const SidePanelProvider:
  React.FC<{
    children: React.ReactNode;
  }> = ({ children }) => {
  const [
    isOpen,
    setIsOpen,
  ] = useState(false);

  const openPanel =
    useCallback(
      () => setIsOpen(true),
      []
    );

  const closePanel =
    useCallback(
      () => setIsOpen(false),
      []
    );

  const value =
    useMemo(
      () => ({
        isOpen,
        openPanel,
        closePanel,
      }),
      [
        isOpen,
        openPanel,
        closePanel,
      ]
    );

  return (
    <SidePanelContext.Provider
      value={value}
    >
      {children}
    </SidePanelContext.Provider>
  );
};

export const useSidePanel =
  () => {
    const value =
      useContext(
        SidePanelContext
      );

    if (!value) {
      throw new Error(
        'useSidePanel must be used inside SidePanelProvider'
      );
    }

    return value;
  };
