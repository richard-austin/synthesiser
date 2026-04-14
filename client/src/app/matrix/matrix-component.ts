import {AfterViewInit, Component, Input, QueryList, ViewChildren} from '@angular/core';
import {MatrixControlComponent, ModLevel, ModSetting} from '../matrix-control/matrix-control-component';
import {SynthComponent} from '../synth/synth-component';
import {OscillatorComponent} from '../oscillator/oscillator.component';
import {MatrixSettings} from '../settings/matrix';
import {Cookies} from '../settings/cookies/cookies';

@Component({
  selector: 'app-matrix',
  imports: [
    MatrixControlComponent
  ],
  templateUrl: './matrix-component.html',
  styleUrl: './matrix-component.scss',
})
export class MatrixComponent implements AfterViewInit {
  @ViewChildren(MatrixControlComponent) matrixControls!: QueryList<MatrixControlComponent>;
  @Input() oscillators!: QueryList<OscillatorComponent>;

  protected _oscillatorParams = SynthComponent.oscillatorParams;
  private cookies!: Cookies;
  private proxySettings!: MatrixSettings;
  constructor() {
    this.cookies = new Cookies();
  }

  public start(settings: MatrixSettings | null): void {
    const cookieName = 'matrix';
    if (!settings) {  // If no settings supplied, create default and check if previously saved in cookie
      settings = new MatrixSettings();
      const savedSettings = this.cookies.getSettings(cookieName, settings);

      if (Object.keys(savedSettings).length > 0) {
        // Use values from cookie
        settings = savedSettings as MatrixSettings;
      }
      // else use default settings
    }

    this.proxySettings = this.cookies.getSettingsProxy(settings, cookieName);

    this.proxySettings.matrix.forEach((row, i) =>
    row.forEach((mtxCtl, j) => {
      // @ts-ignore
      const control = this.matrixControls.get(i+this.proxySettings.size * j) as MatrixControlComponent;
      control.start(mtxCtl);
    }));
  }

  public getSettings(): MatrixSettings {
    return this.proxySettings;
  }

  protected modSelection(modSetting: ModSetting) {
    const element = this.proxySettings.matrix[modSetting.carrier][modSetting.modulator]
    element.setting = modSetting.modType;
  }

  protected modLevel(modLevel: ModLevel) {
    const element = this.proxySettings.matrix[modLevel.carrier][modLevel.modulator]
    element.level = modLevel.level;
  }
  ngAfterViewInit(): void {
    this.matrixControls.forEach(control => {
      //control.
    });
  }
}
