export class EnvelopeGraphConstants {
  readonly xScale: number;
  readonly xOffset: number;
  readonly yScale: number;
  readonly yOffset: number;
  constructor(xScale: number, xOffset: number, yScale: number, yOffset: number) {
    this.xScale = xScale;
    this.xOffset = xOffset;
    this.yScale = yScale;
    this.yOffset = yOffset;
  }
}
