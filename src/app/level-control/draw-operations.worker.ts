/// <reference lib="webworker" />
import {dialStyle, LevelControlParameters} from './levelControlParameters';

let render: Renderer;
addEventListener('message', ({data}) => {
  if (data.canvas && data.params) {
    render = new Renderer(data.canvas, data.params);
    let angle = 0;
    render.drawCursor(false);
    render.drawDial(angle);
    render.drawLabel();
  }
  if (render && data.angle !== undefined) {
    render.drawDial(data.angle);
  } else if (data === "focus" || data === "blur") {
    render.focus(data === "focus");
  }
//  postMessage(response);
});

class Renderer {
  private readonly canvas: OffscreenCanvas;
  private readonly params: LevelControlParameters;

  constructor(canvas: OffscreenCanvas, params: LevelControlParameters) {
    this.canvas = canvas;
    this.params = params;
  }

  readonly cursorLength = 7;
  readonly cursorWidth = 10;
  readonly cursorOffset = 2;
  readonly labelGap = 10;

  drawLabel() {
    const ctx = this.canvas.getContext('2d');
    if (ctx) {
      ctx.save();
      ctx.font = `bold 14px arial`;
      ctx.fillStyle = '#000';

      ctx.translate(this.params.centreX, this.params.centreY - this.params.radius - this.cursorOffset - this.labelGap);
      ctx.fillText(this.params.label, 0, 0);
      ctx.restore();
    }
  }

  drawCursor(focus: boolean) {
    const ctx = this.canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(this.params.centreX, this.params.centreY - this.params.radius - this.cursorOffset);
      ctx.lineTo(this.params.centreX + this.cursorWidth / 2, this.params.centreY - this.params.radius - this.cursorLength - this.cursorOffset);
      ctx.lineTo(this.params.centreX - this.cursorWidth / 2, this.params.centreY - this.params.radius - this.cursorLength - this.cursorOffset);
      ctx.closePath();
      ctx.fillStyle = focus ? '#a00' : '#000';
      ctx.fill();
    }
  }

  private readonly styles: Map<dialStyle, [string,string][]> = new Map([
    [dialStyle.blue, [['#ccf', '#aaa'],['gray','darkgray'],['lightblue','darkblue']]],
      [dialStyle.red, [['#fcc', '#aaa'],['gray','darkgray'],['lightpink','darkred']]],
      [dialStyle.green, [['#cfc', '#aaa'],['gray','darkgray'],['lightgreen','green']]],
      [dialStyle.yellow, [['#ffc', '#aaa'],['gray','darkgray'],['yellow','brown']]]
  ]);

  drawDial(angle: number) {
    // const canvas = this.canvas;
    const ctx = this.canvas.getContext('2d');
    const toRads = Math.PI / 180;

    if (ctx !== null) {
      const p = this.params;
      // Outer edge of skirting
      ctx.beginPath();
      const radGrad = ctx.createRadialGradient(p.centreX, p.centreY, p.skirtInnerRadius, p.centreX, p.centreY, p.radius);
      const style:[string,string] = (this.styles.get(p.style) as unknown) as [string, string];
      radGrad.addColorStop(0, style[0][0]);
      radGrad.addColorStop(1, style[0][1]);
      ctx.arc(p.centreX, p.centreY, p.radius, 0, 2 * Math.PI, false);
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'white';
      ctx.fillStyle = radGrad;
      ctx.fill();
      ctx.stroke();
      ctx.closePath();

      // Create linear gradient
      const grad1 = ctx.createLinearGradient(0, 0, 0, 130);
      grad1.addColorStop(0, style[1][0]);
      grad1.addColorStop(1, style[1][1]);
      // Inner edge of skirting
      ctx.beginPath();
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      ctx.fillStyle = grad1;
      ctx.strokeStyle = 'black';
      ctx.arc(p.centreX, p.centreY, p.skirtInnerRadius, 0, 2 * Math.PI, false);
      ctx.fill();
      ctx.stroke();
      ctx.closePath();

      // Create linear gradient
      const grad = ctx.createLinearGradient(p.centreX - p.centreButtonRadius, p.centreY - p.centreButtonRadius, p.centreX + p.centreButtonRadius, p.centreY + p.centreButtonRadius);
      // @ts-ignore
      grad.addColorStop(0, style[2][0]);
      // @ts-ignore
      grad.addColorStop(1, style[2][1]);

      // Center button
      this.centreButton(ctx, grad);

      // Calibrations
      ctx.textAlign = 'center';
      const fontSize = (this.params.radius - this.params.skirtInnerRadius) / 1.5;
      ctx.font = `bold ${fontSize}px serif`;
      ctx.fillStyle = '#000';

      const plusMinus = p.plusMinus;
      const lowSetting = plusMinus ? -p.divisions / 2 : 0;
      const offsetAngle = plusMinus ? p.calAngle / 2 : 0;
      const divisionIncrement = Math.ceil(p.divisions / 10);
      for (let i = 0; i <= p.divisions; i += divisionIncrement) {
        const x = Math.cos(((-i / p.divisions * p.calAngle) + p.align - p.calAngle + angle+offsetAngle) * toRads) * (p.radius - fontSize) + p.centreX;
        const y = Math.sin(((-i / p.divisions * p.calAngle) + p.align - p.calAngle + angle+offsetAngle) * toRads) * (p.radius - fontSize) + p.centreY;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(((-i / p.divisions * p.calAngle) - p.calAngle + p.align + 90 + angle+offsetAngle) * toRads);
        ctx.fillText((i+lowSetting).toString(), 0, 0);
        ctx.restore();
      }

      const grad3 = ctx.createLinearGradient(p.centreX - p.centreButtonRadius, p.centreY - p.centreButtonRadius, p.centreX + p.centreButtonRadius, p.centreY + p.centreButtonRadius);
      grad3.addColorStop(0, "gray");
      grad3.addColorStop(1, "black");

      // Knurling
      for (let knurl = 0; knurl < 360; knurl += p.knurlAngle) {
        const x1 = p.centreX + Math.cos((knurl + angle) * toRads) * (p.centreButtonRadius);
        const y1 = p.centreY + Math.sin((knurl + angle) * toRads) * (p.centreButtonRadius);
        const x2 = p.centreX + Math.cos((knurl + angle) * toRads) * (p.skirtInnerRadius);
        const y2 = p.centreY + Math.sin((knurl + angle) * toRads) * (p.skirtInnerRadius);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.closePath();
      }

      const finish = performance.now();
      //  console.log("Time = " + (finish - start).toString());
    }
  }

  centreButton(ctx: OffscreenCanvasRenderingContext2D, grad: CanvasGradient) {
    const p = this.params;
    ctx.beginPath();
    ctx.arc(p.centreX, p.centreY, p.centreButtonRadius, 0, 2 * Math.PI, false);
    ctx.fillStyle = grad;
    ctx.fill();
    // ctx.stroke();
    ctx.closePath();
  }

  focus(focus: boolean) {
    this.drawCursor(focus);
  }
}
