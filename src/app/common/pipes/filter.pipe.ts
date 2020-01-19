import {Pipe, PipeTransform} from '@angular/core';

@Pipe({
  name: 'filter',
})
export class FilterPipe implements PipeTransform {
  /**
   * Used from React Material's Autocomplete code
   * @param needle haystack
   * @param haystack needle
   * @returns {boolean} was the needle fuzzy found in the haystack
   */
  static fuzzyFilter(needle: string, haystack: string): boolean {
    let searchTextIndex = 0;
    for (let index = 0; index < haystack.length; index++) {
      if (haystack[index] === needle[searchTextIndex]) {
        searchTextIndex += 1;
      }
    }

    return searchTextIndex === needle.length;
  }

  static containsFilter(needle: string, haystack: string) {
    return haystack.indexOf(needle) >= 0;
  }

  static doFilter<T>(items: T[], searchText: string, useFuzzy: boolean, getFilterText: (item: T) => string): T[] {
    if (!items) {
      return [];
    }
    if (!searchText) {
      return items;
    }
    searchText = searchText.toLowerCase();
    return items.filter(it => {
      return useFuzzy ?
             FilterPipe.fuzzyFilter(searchText, getFilterText(it).toLowerCase()) :
             FilterPipe.containsFilter(searchText, getFilterText(it).toLowerCase());
    });
  }

  transform(items: string[], searchText: string, useFuzzy: boolean = true): string[] {
    return FilterPipe.doFilter(items, searchText, useFuzzy, item => item);
  }
}

@Pipe({
  name: 'filterObject',
})
export class FilterObjectPipe implements PipeTransform {
  transform<T>(items: T[], getValue: Function | string, searchText: string, useFuzzy: boolean = true): T[] {
    if (!items) {
      return [];
    }
    if (!searchText || searchText.length == 0) {
      return items;
    }
    searchText = searchText.toLowerCase();
    return FilterPipe.doFilter(
      items,
      searchText,
      useFuzzy,
      it => (typeof getValue == 'function' ? getValue(it) : it[getValue]).toLowerCase());
  }
}
