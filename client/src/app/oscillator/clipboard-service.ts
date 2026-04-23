import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ClipboardService {
  public config: string | undefined= undefined;
  source: number = -1;
  type: "oscillator"|"filter"|undefined = undefined;
}
