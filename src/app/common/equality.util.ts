export class EqualityUtil {
    static listsEqual<T>(prev: T[],
                         current: T[],
                         getId: (obj: T) => string,
                         isEqual?: (a: T, b: T) => boolean): boolean {
        if ((!prev !== !current) || prev.length !== current.length) {
            return false;
        }
        if (prev === current) {
            return true;
        }

        const currMap: { [name: string]: T } = {};
        current.forEach(b => currMap[getId(b)] = b);

        isEqual = isEqual ||
            ((a, b) => (a === b) || (a && b &&
                Object.keys(a).length === Object.keys(b).length &&
                Object.keys(a).every(k => a[k] === b[k])));

        return prev.some((b) => !isEqual(currMap[getId(b)], b));
    }
}
