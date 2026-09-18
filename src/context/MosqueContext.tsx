import React, { createContext, useContext, useEffect, useState } from 'react';
import { Mosque } from '../types';
import { getGlobalMosque, setGlobalMosque, subscribeMosque } from '../lib/mosqueStore';

interface MosqueContextType {
  mosque: Mosque | null;
  setMosque: (mosque: Mosque | null) => void;
}

const MosqueContext = createContext<MosqueContextType>({
  mosque: null,
  setMosque: () => {},
});

export const MosqueProvider: React.FC<{
  initialMosque?: Mosque | null;
  children: React.ReactNode;
}> = ({ initialMosque, children }) => {
  const [mosque, setMosqueState] = useState<Mosque | null>(
    initialMosque || getGlobalMosque()
  );

  useEffect(() => {
    if (initialMosque) {
      setGlobalMosque(initialMosque);
      setMosqueState(initialMosque);
    }
  }, [initialMosque]);

  useEffect(() => {
    const unsubscribe = subscribeMosque((m) => {
      setMosqueState(m);
    });
    return unsubscribe;
  }, []);

  const handleSetMosque = (newMosque: Mosque | null) => {
    setGlobalMosque(newMosque);
    setMosqueState(newMosque);
  };

  return (
    <MosqueContext.Provider value={{ mosque, setMosque: handleSetMosque }}>
      {children}
    </MosqueContext.Provider>
  );
};

export function useMosque(): Mosque | null {
  const context = useContext(MosqueContext);
  return context.mosque || getGlobalMosque();
}
