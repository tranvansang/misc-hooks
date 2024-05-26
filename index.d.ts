import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
type OptionalArraySub<T extends readonly unknown[], R extends readonly unknown[]> = number extends R['length'] ? never : number extends T['length'] ? never : T['length'] extends R['length'] ? R : OptionalArraySub<T, [...R, undefined | T[R['length']]]>;
export type OptionalArray<T extends readonly unknown[]> = number extends T['length'] ? (T[number] | undefined)[] : OptionalArraySub<T, []>;
export declare const nextStateFromAction: <T>(action: SetStateAction<T>, state: T) => T;
export declare const useToggle: (init?: boolean) => [boolean, (state?: boolean) => void];
export declare const useTurnOff: () => [boolean, () => void];
export declare const useTurnOn: () => [boolean, () => void];
export declare const useUnmountedRef: () => MutableRefObject<boolean>;
export declare const useMountedRef: () => MutableRefObject<boolean>;
export declare const useMounted: () => boolean;
export declare const useTimedOut: (timeout: number) => boolean;
export declare const useDebounce: <T>(value: T, timeout: number) => T;
export declare const useDeepMemo: <T>(val: T, isEqual?: (cur: T, next: T) => boolean) => T;
export declare const useForceUpdate: () => () => void;
export declare const usePrevRef: <T>(value: T) => MutableRefObject<T | undefined>;
export declare const useDefaultState: <T>(defaultState: T) => readonly [T, Dispatch<SetStateAction<T>>];
export declare const useEffectWithPrevDeps: <T extends readonly unknown[]>(effect: (prevDeps: OptionalArray<T>) => (void | (() => void | undefined)), deps: T) => void;
export declare const useLayoutEffectWithPrevDeps: <T extends readonly unknown[]>(effect: (prevDeps: OptionalArray<T>) => (void | (() => void | undefined)), deps: T) => void;
export declare const useEffectOnce: <T extends readonly unknown[]>(effect: () => (void | (() => void | undefined)), deps: T) => void;
export declare function useEnhancedState<S>(initialState?: S | (() => S)): [S, Dispatch<SetStateAction<S>>, MutableRefObject<S>];
export declare function useEnhancedState<S = undefined>(): [
    S | undefined,
    Dispatch<SetStateAction<S | undefined>>,
    MutableRefObject<S | undefined>
];
export declare function useRefState<T>(initialValue: T): [T, Dispatch<SetStateAction<T>>, MutableRefObject<T>];
export declare function useRefState<T = undefined>(): [
    T | undefined,
    Dispatch<SetStateAction<T | undefined>>,
    MutableRefObject<T | undefined>
];
export declare const useAtomicMaker: () => [boolean, <T, V>(cb: (...params: T[]) => V) => ((...params: T[]) => Promise<V | void>)];
export declare const useAtomicCallback: <T, V extends Promise<any>>(cb: (...params: T[]) => V) => [boolean, (...params: T[]) => Promise<V | void>];
export declare const useRefValue: <T>(value: T) => MutableRefObject<T>;
export declare function usePropState<S>(initialState: S | (() => S)): {
    value: S;
    setValue: Dispatch<SetStateAction<S>>;
};
export declare function usePropState<S = undefined>(): {
    value: S | undefined;
    setValue: Dispatch<SetStateAction<S | undefined>>;
};
export declare const useScopeId: (prefix?: string) => (name?: string) => string;
export declare const useUpdate: <T>(getValue: (current?: T) => T) => [T, import("react").DispatchWithoutAction];
export declare const useKeep: <T>(value: T) => T;
export declare function useListData<T>({ load, initial, }: {
    initial?: {
        list: T[];
        hasNext: boolean;
        hasPrev: boolean;
    };
    load(params: {
        before?: T;
        after?: T;
    }): Promise<{
        records: T[];
        hasMore: boolean;
    }>;
}): {
    setState: Dispatch<SetStateAction<{
        list: T[];
        hasNext: boolean;
        hasPrev: boolean;
    }>>;
    loadNext(): Promise<{
        records: T[];
        hasMore: boolean;
    } | undefined>;
    loadPrev(): Promise<{
        records: T[];
        hasMore: boolean;
    } | undefined>;
    list: T[];
    hasNext: boolean;
    hasPrev: boolean;
};
export interface AtomState<T> {
    get value(): T;
    set value(v: T);
    sub(subscriber: (v: T) => any): () => void;
}
export declare function makeAtom<T>(): AtomState<T | undefined>;
export declare function makeAtom<T>(initial: T): AtomState<T>;
export declare const useAtom: <T>(atom: AtomState<T>) => T;
export {};
