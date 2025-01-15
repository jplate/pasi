import { useRef, useCallback } from 'react';

export const equalArrays = (arr1: any[], arr2: any[]) => {
    // Check if both arrays are the same reference
    if (arr1 === arr2) return true;

    // Check if the lengths are different
    if (arr1.length !== arr2.length) return false;

    // Check each element for equality
    for (let i = 0; i < arr1.length; i++) {
        if (arr1[i] !== arr2[i]) return false;
    }

    return true; // All checks passed, arrays are equal
}

export const sameElements = (ar0: any[], ar1: any[]) => {
    const set0 = new Set(ar0);
    const set1 = new Set(ar1);
    return set0.size===set1.size && ar0.every(el => set1.has(el));
}


export const throttle = <T extends (...args: any[]) => void>(func: T, limit: number) => {
    let lastFunc: ReturnType<typeof setTimeout>;
    let lastRan: number;
    return function(...args: Parameters<T>) {
        if (!lastRan) {
            func(...args);
            lastRan = Date.now();
        } 
        else {
            clearTimeout(lastFunc);
            lastFunc = setTimeout(() => {
                if ((Date.now() - lastRan) >= limit) {
                    func(...args);
                    lastRan = Date.now();
                }
            }, limit - (Date.now() - lastRan));
        }
    };
}

export const useThrottle = <T extends (...args: any[]) => void>(
    callback: T,
    delay: number
) => {
    const throttledCallback = useRef<ReturnType<typeof setTimeout> | null>(null);

    return useCallback((...args: Parameters<T>) => {
            if (!throttledCallback.current) {
                callback(...args);
                throttledCallback.current = setTimeout(() => {
                    throttledCallback.current = null;
                }, delay);
            }
        },
        [callback, delay]
    );
}


export const debounce = <T extends (...args: any[]) => void>(func: T, wait: number) => {
    let timeout: ReturnType<typeof setTimeout>;
    return function(...args: Parameters<T>) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
}


export const addAlpha = (hex: string, opacity: number) => {
    const alpha = Math.round(opacity * 255).toString(16).padStart(2, '0');
    return `${hex}${alpha}`;
}


export const matchKeys = (event: React.KeyboardEvent<HTMLElement>, combination: string): boolean => {
    const keys = combination.split('+');
    const key = keys.pop(); // Get the last key (the main key)

    // Check if the main key matches
    const keyMatches = event.key.toLowerCase() === key?.toLowerCase();

    // Check for modifier keys
    const modifiers: { [key: string]: boolean } = {
        shift: event.shiftKey,
        ctrl: event.ctrlKey || event.metaKey, // Meta key for Mac (Command)
        alt: event.altKey,
        // Add more modifiers if needed
    };

    // Check if all specified modifiers are pressed
    const modifiersMatch = keys.every(modifier => modifiers[modifier]);

    return keyMatches && modifiersMatch;
}
