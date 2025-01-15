import { useRef, MutableRefObject  } from "react";


type History<T> = {
    push: (newState: T) => void,
    before: () => T,
    after: () => T,
    canRedo: boolean,
    canUndo: boolean,
    history: MutableRefObject<T[]>,
    now: MutableRefObject<number>
};

/**
 * A very basic undo manager hook. The app works with its own 'local' state, and uses the functions provided here only for accessing
 * previous and later versions of that state. The app is also responsible for copying the state when needed.
 */
export function useHistory<T>(initialState: T, max: number): History<T> {
    const history = useRef<T[]>([initialState]);
    const now = useRef(0);

    const push = (newState: T) => {
        const updatedHistory = history.current.slice(0, now.current + 1);
        updatedHistory.push(newState);

        if (updatedHistory.length > max) {
            updatedHistory.shift(); // Remove the oldest state
        }

        history.current = updatedHistory;
        now.current = updatedHistory.length - 1;
        //console.log(`NOW: ${updatedHistory.length - 1}`);
    };
    
    const before = (): T => {
        let newNow = now.current;
        if (newNow > 0) newNow--;
        now.current = newNow;
        return history.current[newNow];
    };

    const after = (): T => {
        let newNow = now.current;
        if (newNow < history.current.length - 1) newNow++;
        now.current = newNow;
        return history.current[newNow]
    };

    return {
        push,
        before,
        after,
        canUndo: now.current > 0,
        canRedo: now.current < history.current.length - 1,
        history,
        now
    };
}
