export class LevelControlParameters {
  canvas: OffscreenCanvas;
  radius: number;
  centreButtonRadius: number;
  skirtInnerRadius: number;
  knurlAngle: number;
  centreX: number;
  centreY: number;
  calAngle: number;
  align: number;  // Align zero position
  divisions: number;
  textPos: number;

  constructor(canvas: OffscreenCanvas,
              radius: number,
              calAngle: number,
              divisions: number,
              centreX: number = canvas.width / 2,
              centreY: number = canvas.height / 2,
              textPos: number = -15,
              centreButtonRadius: number = radius - 18,
              skirtInnerRadius: number = radius - 25,
              knurlAngle: number = 6) {
    this.canvas = canvas;
    this.radius = radius;
    this.centreButtonRadius = centreButtonRadius;
    this.skirtInnerRadius = skirtInnerRadius;
    this.knurlAngle = knurlAngle;
    this.centreX = centreX;
    this.centreY = centreY;
    this.calAngle = calAngle;
    this.align = calAngle - 90;  // Align zero position
    this.divisions = divisions;
    this.textPos = textPos;
  }

  getObject():{} {
    return {
      // canvas: this.canvas,
      radius: this.radius,
      centreButtonRadius: this.centreButtonRadius,
      skirtInnerRadius: this.skirtInnerRadius,
      knurlAngle: this.knurlAngle,
      centreX: this.centreX,
      centreY: this.centreY,
      calAngle: this.calAngle,
      align: this.align,
      divisions: this.divisions,
      textPos: this.textPos
    };
  }
}

