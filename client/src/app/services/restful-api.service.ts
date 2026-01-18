import { Injectable } from '@angular/core';
import {SynthSettings} from '../settings/synth-settings';
import {HttpClient, HttpHeaders} from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class RestfulApiService {
  constructor(private http: HttpClient) {
  }

  readonly httpTextOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
    })
  }
  saveConfig(synthSettings: SynthSettings, fileName: string) {
      const params: {} = {fileName: fileName, synthSettings: synthSettings};
      return this.http.post<{}>('/syn/saveConfig', JSON.stringify(params), this.httpTextOptions)
  }
}
