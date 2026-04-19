import {AfterViewInit, Component, Input, QueryList, ViewChildren, WritableSignal} from '@angular/core';
import {MatrixControlComponent, ModSetting} from '../matrix-control/matrix-control-component';
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
  @Input() selectOperator!: WritableSignal<number>;

  protected _oscillatorParams = SynthComponent.oscillatorParams;
  private cookies!: Cookies;
  private proxySettings!: MatrixSettings;
  private audioCtx!: AudioContext;


  constructor() {
    this.cookies = new Cookies();
  }

  public start(audioCtx: AudioContext, settings: MatrixSettings | null): void {
    this.audioCtx = audioCtx;

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

    this.proxySettings.matrix.forEach((row, carrierIdx) =>
    row.forEach((mtxCtl, modIdx) => {
      const control = this.matrixControls.get(carrierIdx*this.proxySettings.size + modIdx) as MatrixControlComponent;
      control.start(this.audioCtx, mtxCtl,this.oscillators.get(modIdx), this.oscillators.get(carrierIdx));
    }));
  }

  public getSettings(): MatrixSettings {
    return this.proxySettings;
  }

  protected modSelection(modSetting: ModSetting) {
    const element = this.proxySettings.matrix[modSetting.carrier][modSetting.modulator]
    element.setting = modSetting.modType;
  }

  ngAfterViewInit(): void {
  }
}
