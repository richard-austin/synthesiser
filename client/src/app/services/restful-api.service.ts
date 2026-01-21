import { Injectable } from '@angular/core';
import {SynthSettings} from '../settings/synth-settings';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {Observable} from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class RestfulApiService {
  constructor(private http: HttpClient) {
  }

  readonly httpJsonOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json; text/html; charset=UTF-8',
    })
  }

  saveConfig(synthSettings: SynthSettings, fileName: string) {
      const params: {} = {fileName: fileName, synthSettings: synthSettings};
      return this.http.post<{}>('/syn/saveConfig', JSON.stringify(params), this.httpJsonOptions)
  }

  getConfigFileList(): Observable<string[]> {
    return this.http.post<string[]>('/syn/getConfigFileList', '', this.httpJsonOptions);
  }

  getSettings(fileName: string): Observable<SynthSettings> {
    const params = {fileName: fileName};
    return this.http.post<SynthSettings>('/syn/getSettings', JSON.stringify(params), this.httpJsonOptions);
  }
}
