import { Dispatch, RefObject, SetStateAction } from 'react';
type OptionalArraySub<T extends readonly unknown[], R extends readonly unknown[]> = number extends R['length'] ? never : number extends T['length'] ? never : T['length'] extends R['length'] ? R : OptionalArraySub<T, [...R, undefined | T[R['length']]]>;
export type OptionalArray<T extends readonly unknown[]> = number extends T['length'] ? (T[number] | undefined)[] : OptionalArraySub<T, []>;
export declare function nextStateFromAction<T>(action: SetStateAction<T>, state: T): T;
export declare function useToggle(init?: boolean): [boolean, (state?: boolean) => void];
export declare function useTurnOff(): [boolean, () => void];
export declare function useTurnOn(): [boolean, () => void];
export declare function useUnmountedRef(): RefObject<boolean>;
export declare function useMountedRef(): RefObject<boolean>;
export declare function useMounted(): boolean;
export declare function useTimedOut(timeout: number): boolean;
export declare function useDebounce<T>(value: T, timeout: number): T;
export declare function useDeepMemo<T>(val: T, isEqual?: (cur: T, next: T) => boolean): T;
export declare function useForceUpdate(): () => void;
export declare function usePrevRef<T>(value: T): RefObject<T | undefined>;
export declare function useDefaultState<T>(defaultState: T): readonly [T, Dispatch<SetStateAction<T>>];
export declare function useEffectWithPrevDeps<T extends readonly unknown[]>(effect: (prevDeps: OptionalArray<T>) => (void | (() => void | undefined)), deps: T): void;
export declare function useLayoutEffectWithPrevDeps<T extends readonly unknown[]>(effect: (prevDeps: OptionalArray<T>) => (void | (() => void | undefined)), deps: T): void;
export declare function useEffectOnce<T extends readonly unknown[]>(effect: () => (void | (() => void | undefined)), deps: T): void;
export declare function useEnhancedState<S>(initialState?: S | (() => S)): [S, Dispatch<SetStateAction<S>>, RefObject<S>];
export declare function useEnhancedState<S = undefined>(): [
    S | undefined,
    Dispatch<SetStateAction<S | undefined>>,
    RefObject<S | undefined>
];
export declare function useRefState<T>(initialValue: T): [T, Dispatch<SetStateAction<T>>, RefObject<T>];
export declare function useRefState<T = undefined>(): [
    T | undefined,
    Dispatch<SetStateAction<T | undefined>>,
    RefObject<T | undefined>
];
export declare function useAtomicMaker(): [
    boolean,
    <T, V>(cb: (...params: T[]) => V) => ((...params: T[]) => Promise<V | undefined>)
];
export declare function useAtomicCallback<T, V extends Promise<any>>(cb: (...params: T[]) => V): [boolean, (...params: T[]) => Promise<V | undefined>];
export declare function useRefValue<T>(value: T): RefObject<T>;
export declare function usePropState<S>(initialState: S | (() => S)): {
    value: S;
    setValue: Dispatch<SetStateAction<S>>;
};
export declare function usePropState<S = undefined>(): {
    value: S | undefined;
    setValue: Dispatch<SetStateAction<S | undefined>>;
};
export declare function useScopeId(prefix?: string): (name?: string) => string;
export declare function useUpdate<T>(getValue: (current?: T) => T): [T | undefined, import("react").ActionDispatch<[]>];
export declare function useKeep<T>(value: T): T;
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
export interface Atom<T> {
    get value(): T;
    set value(newValue: T);
    sub(subscriber: (newValue: T, oldValue: T) => void | (() => void), options?: {
        now?: boolean;
        skip?(newValue: T, oldValue: T): boolean;
    }): () => void;
}
export declare function makeAtom<T>(): Atom<T | undefined>;
export declare function makeAtom<T>(initial: T): Atom<T>;
export declare function combineAtoms<T extends readonly any[]>(atoms: {
    [K in keyof T]: Atom<T[K]>;
}): Atom<T>;
export declare function useAtom<T>(atom: Atom<T>): T;
export type Disposer = ReturnType<typeof makeDisposer>;
export declare function makeDisposer(): {
    addDispose(this: void, dispose?: () => void): () => void;
    dispose(this: void): void;
    signal: AbortSignal;
};
type AsyncState<T> = {
    data: T;
    error?: undefined;
    loading: false;
} | {
    data?: undefined;
    error: unknown;
    loading: false;
} | {
    data?: undefined;
    error?: undefined;
    loading: boolean;
};
export declare function useAsync<T, Params extends any[]>(asyncFn: (disposer: {
    signal: Disposer['signal'];
    addDispose: Disposer['addDispose'];
    params: Params;
}) => Promise<T> | T, getInitial?: () => T | undefined): AsyncState<T> & {
    reload(this: void, ...params: Params): Promise<T>;
};
export declare function useAsyncEffect(asyncFn: (disposer: Omit<Disposer, 'dispose'>) => any, deps: readonly any[]): void;
export {};
