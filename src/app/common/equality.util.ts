import * as _ from 'lodash';

export class EqualityUtil {
    static listsEqual<T>(prev: T[],
                         current: T[]): boolean {
        return _.isEqual(prev, current);
    }
}
