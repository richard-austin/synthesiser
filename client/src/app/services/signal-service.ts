import {Injectable, signal, WritableSignal} from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SignalService {
  public fileName: WritableSignal<string> = signal<string>("");
  public configFileComponentControl: WritableSignal<boolean> = signal<boolean>(false);
  public rename: WritableSignal<{oldName: string, newName: string}> = signal<{oldName:string, newName: string}>({oldName:"", newName:""});
}

