export interface Atom<T> {
    get value(): T;
    set value(val: T);
    sub(subscriber: (val: T, old: T) => void | (() => void), options?: {
        now?: boolean;
        skip?(val: T, old: T): boolean;
    }): () => void;
}
export declare function makeAtom<T>(): Atom<T | undefined>;
export declare function makeAtom<T>(initial: T): Atom<T>;
export declare function combineAtoms<T extends readonly any[]>(atoms: {
    [K in keyof T]: Atom<T[K]>;
}): Atom<T>;
