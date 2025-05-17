export {};

// override types for global functions

declare global {
  interface ObjectConstructor {
    fromEntries<V, K>(
      entries: [K, V][],
    ): Record<K extends string | number | symbol ? K : string, V>;

    entries<V, K extends string | number | symbol>(obj: Record<K, V>): [K, V][];
  }
}
