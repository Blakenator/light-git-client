import {Pipe, PipeTransform} from '@angular/core';

@Pipe({
  name: 'filter'
})
export class FilterPipe implements PipeTransform {
  /**
   * Used from React Material's Autocomplete code
   * @param searchText haystack
   * @param key needle
   * @returns {boolean} was the needle fuzzy found in the haystack
   */
  static fuzzyFilter(searchText, key) {
    let searchTextIndex = 0;
    for (let index = 0; index < key.length; index++) {
      if (key[index] === searchText[searchTextIndex]) {
        searchTextIndex += 1;
      }
    }

    return searchTextIndex === searchText.length;
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
  name: 'filterObject'
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
