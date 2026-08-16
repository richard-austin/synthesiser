/**
 * Nonlinear 4-pole ladder low-pass filter.
 *
 * Designed for analogue-style synth filtering:
 *
 *   - 24 dB/octave
 *   - Resonant feedback
 *   - Nonlinear saturation
 *   - Zero-delay-feedback style topology
 *   - Audio-rate cutoff modulation is supported
 *   - Normalised resonance control (0..1)
 *   - Input drive
 *
 * The character is broadly in the Moog / SH-101 family,
 * rather than being a circuit-perfect emulation.
 */
export class LadderFilter4Pole {
  private readonly sampleRate: number;

  private cutoffHz = 1000;
  private resonance = 0;
  private drive = 1;

  /*
   * TPT integrator states.
   */
  private s1 = 0;
  private s2 = 0;
  private s3 = 0;
  private s4 = 0;

  /*
   * Previous output is useful for optional smoothing /
   * diagnostics and gives us a convenient output state.
   */
  private output = 0;

  /*
   * Cached filter coefficient.
   */
  private g = 0;

  /*
   * Resonance scaling.
   *
   * An ideal 4-pole ladder reaches the edge of
   * self-oscillation at approximately k = 4.
   */
  private resonanceGain = 0;

  /*
   * Number of fixed-point iterations used to resolve
   * the zero-delay feedback loop.
   */
  private readonly iterations = 3;

  constructor(
    sampleRate: number,
    cutoffHz = 1000,
    resonance = 0,
    drive = 1
  ) {
    if (!Number.isFinite(sampleRate) || sampleRate <= 0) {
      throw new Error("Invalid sample rate");
    }

    this.sampleRate = sampleRate;

    this.setCutoff(cutoffHz);
    this.setResonance(resonance);
    this.setDrive(drive);
  }

  // ------------------------------------------------------------
  // Parameters
  // ------------------------------------------------------------

  /**
   * Set cutoff frequency in Hz.
   */
  public setCutoff(cutoffHz: number): void {
    this.cutoffHz = Math.max(
      5,
      Math.min(cutoffHz, this.sampleRate * 0.45)
    );

    this.updateCoefficient();
  }

  /**
   * Set resonance from 0 to 1.
   *
   * 0.0 = no resonance
   * 0.5 = strong resonance
   * 0.8+ = aggressive
   * 1.0 = near self-oscillation
   */
  public setResonance(resonance: number): void {
    this.resonance = Math.max(0, Math.min(1, resonance));

    /*
     * Slightly soften the upper end of the range.
     *
     * This makes the control more useful musically:
     * the filter doesn't suddenly become unstable at
     * resonance = 1.
     */
    const r = this.resonance;

    this.resonanceGain =
      4.0 * r * (0.85 + 0.15 * r);
  }

  /**
   * Input drive.
   *
   * 1.0 = unity
   * 2.0 = moderate saturation
   * 4.0+ = aggressive
   */
  public setDrive(drive: number): void {
    this.drive = Math.max(0.1, drive);
  }

  public getCutoff(): number {
    return this.cutoffHz;
  }

  public getResonance(): number {
    return this.resonance;
  }

  public getDrive(): number {
    return this.drive;
  }

  // ------------------------------------------------------------
  // Processing
  // ------------------------------------------------------------

  /**
   * Process one sample.
   */
  public process(input: number): number {
    /*
     * Input saturation.
     *
     * This is important for getting away from the sterile
     * sound of a purely linear digital filter.
     */
    const x = Math.tanh(input * this.drive);

    /*
     * Initial estimate for the feedback output.
     */
    let y4 = this.s4;

    let y1 = this.s1;
    let y2 = this.s2;
    let y3 = this.s3;

    /*
     * Solve the zero-delay feedback loop.
     *
     * We don't actually update the integrator states until
     * the final solution has been found.
     */
    for (let i = 0; i < this.iterations; i++) {
      /*
       * Nonlinear resonance feedback.
       */
      const feedback =
        this.resonanceGain * Math.tanh(y4);

      /*
       * Ladder input.
       */
      const u = x - feedback;

      /*
       * Four cascaded TPT one-pole sections.
       */
      y1 = this.tpt(u, this.s1);
      y2 = this.tpt(y1, this.s2);
      y3 = this.tpt(y2, this.s3);
      y4 = this.tpt(y3, this.s4);
    }

    /*
     * Now commit the integrator states.
     *
     * TPT state update:
     *
     *     s[n+1] = 2*y[n] - s[n]
     */
    this.s1 = 2 * y1 - this.s1;
    this.s2 = 2 * y2 - this.s2;
    this.s3 = 2 * y3 - this.s3;
    this.s4 = 2 * y4 - this.s4;

    /*
     * Gentle output saturation.
     *
     * This prevents very high resonance from producing
     * unpleasant digital runaway.
     */
    this.output = Math.tanh(y4);

    return this.output;
  }

  /**
   * Process a Float32Array in-place.
   */
  public processBuffer(buffer: Float32Array): void {
    for (let i = 0; i < buffer.length; i++) {
      buffer[i] = this.process(buffer[i]);
    }
  }

  /**
   * Reset the filter.
   */
  public reset(): void {
    this.s1 = 0;
    this.s2 = 0;
    this.s3 = 0;
    this.s4 = 0;
    this.output = 0;
  }

  // ------------------------------------------------------------
  // Internal filter maths
  // ------------------------------------------------------------

  /**
   * TPT one-pole low-pass stage.
   *
   * y = (g*x + s) / (1 + g)
   */
  private tpt(
    input: number,
    state: number
  ): number {
    return (
      this.g * input + state
    ) / (
      1 + this.g
    );
  }

  /**
   * Calculate the TPT coefficient.
   *
   * g = tan(pi * Fc / Fs)
   */
  private updateCoefficient(): void {
    const normalized =
      Math.PI *
      this.cutoffHz /
      this.sampleRate;

    this.g = Math.tan(normalized);
  }
}
