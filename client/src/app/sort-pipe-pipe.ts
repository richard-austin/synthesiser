import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'sortPipe',
})
export class SortPipePipe implements PipeTransform {

  transform(value: string[], ascending: boolean = true): string[] {
    return value.sort((a,b) => {
      a = a.toLowerCase();
      b = b.toLowerCase();
      return ascending ? a.localeCompare(b) : b.localeCompare(a);
    });
  }
}
