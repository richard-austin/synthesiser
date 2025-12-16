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

  public getSettings(name: string): {} {
    const jsonString = this.getCookie(name);
    return JSON.parse(jsonString);
  }
}
