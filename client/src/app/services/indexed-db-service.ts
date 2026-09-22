import { Injectable } from '@angular/core';
import { openDB, IDBPDatabase } from 'idb';
import {Subscription, timer} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class IndexedDBService {
  private dbPromise!: Promise<IDBPDatabase>;

  constructor() {
    this.initDatabase();
  }

  private initDatabase() {
    this.dbPromise = openDB('AppDatabase', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('synthObj')) {
          db.createObjectStore('synthObj', { keyPath: 'id' });
        }
      },
    });
  }

  // Example async function to add a synth settings object
  async saveSynthObject(obj: { id: string; synthObj: {} }) : Promise<void> {
    const db = await this.dbPromise;

    await db.put('synthObj', {id: obj.id, obj: JSON.stringify(obj.synthObj)});
  }

  // Example async function to fetch a synth settings object
  async getSynthObject(id: string): Promise<any> {
    const db = await this.dbPromise;

    const synthObj = await db.get('synthObj', id);
    return synthObj && synthObj.obj ? JSON.parse(synthObj.obj) : undefined;
  }

  getSettingsProxy(settings:{}, objectName: string): any {
    const handler = {
      get(target:any, key: string) {
        if (key === 'isProxy')
          return true;

        const prop = target[key];

        // return if property not found
        if (prop === undefined || prop === null)
          return;

        // set value as proxy if object
        if (!prop.isProxy && typeof prop == 'object')
          target[key] = new Proxy(prop, handler);

        return target[key];
      },
      set(target: any, key:string, value: any) {
        // @ts-ignore
        // console.log(`${key} set from ${target[key]} to ${value}`);
        target[key] = value;
        saveSettings(objectName);
        return true;
      }
    };
    let sub: Subscription ;
    const saveSettings= (name: string) => {
      sub = timer(300).subscribe(async () => {
        sub?.unsubscribe();
        await this.saveSynthObject({id: name, synthObj: proxySettings});
      });
    }
    const proxySettings = new Proxy(settings, handler);
    return proxySettings;
  }
}
