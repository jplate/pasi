import { useRef, useCallback } from 'react';

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
};

export const useThrottle = <T extends (...args: any[]) => void>(
        callback: T,
        delay: number
    ) => {
        const throttledCallback = useRef<ReturnType<typeof setTimeout> | null>(null);
    
        return useCallback(
            (...args: Parameters<T>) => {
                if (!throttledCallback.current) {
                callback(...args);
                throttledCallback.current = setTimeout(() => {
                    throttledCallback.current = null;
                }, delay);
            }
        },
        [callback, delay]
    );
};