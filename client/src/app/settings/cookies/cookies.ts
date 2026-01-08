import {Subscription, timer} from 'rxjs';

export class Cookies {
  private setCookie(cname: string, cvalue: string, exdays: number) {
    const d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    let expires = "expires=" + d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
  }

  private getCookie(cname: string) {
    const name = cname + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) == ' ') {
        c = c.substring(1);
      }
      if (c.indexOf(name) == 0) {
        return c.substring(name.length, c.length);
      }
    }
    return "";
  }

  private sub: Subscription | null = null;

  public saveSettings(settings: {}, name: string) {
    if (this.sub) {
      this.sub.unsubscribe();
    }
    this.sub = timer(730).subscribe(() => {
      this.sub?.unsubscribe();
      this.sub = null;
      const jsonString = JSON.stringify(settings);
      this.setCookie(name, jsonString, 730);
    });
  }

  public getSettings(name: string, settings: {}): {} {
    let retVal:{} = {};
    try {
      const jsonString = this.getCookie(name);
      retVal = JSON.parse(jsonString);

      // Check if all the fields in settings are obtained from the cookie
      for (const prop in settings) {
        if(!retVal.hasOwnProperty(prop)) {
          retVal = settings;
          break;
        }
      }
    }
    catch (ex) {}

    return retVal;
  }

  // Source - https://stackoverflow.com/a
// Posted by James Coyle, modified by community. See post 'Timeline' for change history
// Retrieved 2025-12-16, License - CC BY-SA 4.0

  getSettingsProxy(settings:{}, cookieName: string): any {
    const handler = {
      get(target:any, key: string) {
        if (key === 'isProxy')
          return true;

        const prop = target[key];

        // return if property not found
        if (typeof prop == 'undefined')
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
        saveSettings(settings, cookieName);
        return true;
      }
    };
    const saveSettings= (settings: {}, name: string) => {
      if (this.sub) {
        this.sub.unsubscribe();
      }
      this.sub = timer(300).subscribe(() => {
        this.sub?.unsubscribe();
        this.sub = null;
        const jsonString = JSON.stringify(proxySettings);
        this.setCookie(name, jsonString, 730);
      });
    }
    const proxySettings = new Proxy(settings, handler);
    return proxySettings;
  }
}
