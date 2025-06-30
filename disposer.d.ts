export type Disposer = ReturnType<typeof makeDisposer>;
export declare function makeDisposer(): {
    addDispose(this: void, dispose?: () => void): () => void;
    dispose(this: void): void;
    signal: AbortSignal;
};
