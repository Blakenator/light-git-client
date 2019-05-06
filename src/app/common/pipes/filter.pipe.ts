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
  static fuzzyFilter(needle, haystack): boolean {
    let searchTextIndex = 0;
    for (let index = 0; index < haystack.length; index++) {
      if (haystack[index] === needle[searchTextIndex]) {
        searchTextIndex += 1;
      }
    }

    return searchTextIndex === needle.length;
  }

  transform(items: any[], searchText: string): any[] {
    if (!items) {
      return [];
    }
    if (!searchText) {
      return items;
    }
    searchText = searchText.toLowerCase();
    return items.filter(it => {
      return FilterPipe.fuzzyFilter(searchText, it.toLowerCase());
    });
  }
}

@Pipe({
  name: 'filterObject',
})
export class FilterObjectPipe implements PipeTransform {
  transform(items: any[], getValue: Function | string, searchText: string): any[] {
    if (!items) {
      return [];
    }
    if (!searchText || searchText.length == 0) {
      return items;
    }
    searchText = searchText.toLowerCase();
    return items.filter(it => {
      let key = (typeof getValue == 'function' ? getValue(it) : it[getValue]).toLowerCase();
      return it !== undefined && FilterPipe.fuzzyFilter(searchText, key);
    });
  }
}
