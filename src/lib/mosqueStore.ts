import { Mosque } from '../types';

let currentMosqueInstance: Mosque | null = null;
const listeners = new Set<(mosque: Mosque | null) => void>();

export function setGlobalMosque(mosque: Mosque | null) {
  currentMosqueInstance = mosque;
  try {
    if (mosque) {
      localStorage.setItem('ml_current_mosque', JSON.stringify(mosque));
    } else {
      localStorage.removeItem('ml_current_mosque');
    }
  } catch {
    // Ignore storage errors
  }
  listeners.forEach((listener) => listener(mosque));
}

export function clearGlobalMosque() {
  setGlobalMosque(null);
}

export function getGlobalMosque(): Mosque | null {
  if (currentMosqueInstance) {
    return currentMosqueInstance;
  }
  try {
    const saved = localStorage.getItem('ml_current_mosque');
    if (saved) {
      currentMosqueInstance = JSON.parse(saved);
      return currentMosqueInstance;
    }
  } catch {
    // Ignore storage errors
  }
  return null;
}

export function subscribeMosque(listener: (mosque: Mosque | null) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
