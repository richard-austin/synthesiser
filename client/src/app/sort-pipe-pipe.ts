import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'sortPipe',
  standalone: true // Ensure this matches your project setup (standalone vs NgModule)
})
export class SortPipePipe implements PipeTransform {
  // Explicitly typing 'value' and the return type helps the template engine track the iterator
  transform(value: string[] | null | undefined, ascending: boolean = true): string[] {
    if (!value) return [];

    // Create a shallow copy using spread [...] to avoid mutating the original array in place
    return [...value].sort((a, b) => {
      const normA = a.toLowerCase();
      const normB = b.toLowerCase();
      return ascending ? normA.localeCompare(normB) : normB.localeCompare(normA);
    });
  }
}
