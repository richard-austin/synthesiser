/// <reference lib="webworker" />
import {LevelControlParameters} from './levelControlParameters';

let render: Renderer;
addEventListener('message', ({data}) => {
  const response = `worker response to ${data}`;
  if (data.canvas && data.params) {
    render = new Renderer(data.canvas, data.params);
    let angle = 0;
    render.drawCursor();
    render.drawDial(angle);
  }
  if (render && data.angle !== undefined) {
    render.drawDial(data.angle);
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

  drawCursor() {
    const cursorLength = 7;
    const cursorWidth = 10;
    const cursorOffset = 2;
    const ctx = this.canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(this.params.centreX, this.params.centreY - this.params.radius - cursorOffset);
      ctx.lineTo(this.params.centreX + cursorWidth / 2, this.params.centreY - this.params.radius - cursorLength - cursorOffset);
      ctx.lineTo(this.params.centreX - cursorWidth / 2, this.params.centreY - this.params.radius - cursorLength - cursorOffset);
      ctx.closePath();
      ctx.fillStyle = '#000';
      ctx.fill();
      ctx.stroke();
    }
  }

  drawDial(angle: number) {
    // const canvas = this.canvas;
    const ctx = this.canvas.getContext('2d');
    const toRads = Math.PI / 180;

    if (ctx !== null) {
      const p = this.params;
      // Outer edge of skirting
      ctx.beginPath();
      const radGrad = ctx.createRadialGradient(p.centreX, p.centreY, p.skirtInnerRadius, p.centreX, p.centreY, p.radius);
      radGrad.addColorStop(0, "#dca");
      radGrad.addColorStop(1, "#a86");
      ctx.arc(p.centreX, p.centreY, p.radius, 0, 2 * Math.PI, false);
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'white';
      ctx.fillStyle = radGrad;
      ctx.fill();
      ctx.stroke();
      ctx.closePath();

      // Create linear gradient
      const grad1 = ctx.createLinearGradient(0, 0, 0, 130);
      grad1.addColorStop(0, "gray");
      grad1.addColorStop(1, "darkgray");
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
      grad.addColorStop(0, "lightblue");
      grad.addColorStop(1, "darkblue");

      // Center button
      ctx.beginPath();
      ctx.arc(p.centreX, p.centreY, p.centreButtonRadius, 0, 2 * Math.PI, false);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.stroke();
      ctx.closePath();

      ctx.textAlign = 'center';
      ctx.font = '16x Arial';
      ctx.fillStyle = '#000';

      // Calibrations
      for (let i = 0; i <= p.divisions; ++i) {
        const x = Math.cos(((-i / p.divisions * p.calAngle) + p.align - p.calAngle + angle) * toRads) * (p.radius + p.textPos) + p.centreX;
        const y = Math.sin(((-i / p.divisions * p.calAngle) + p.align - p.calAngle + angle) * toRads) * (p.radius + p.textPos) + p.centreY;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(((-i / p.divisions * p.calAngle) - p.calAngle + p.align + 90 + angle) * toRads);
        ctx.fillText((i).toString(), 0, 0);
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
        // ctx.lineWidth = 1;
        // ctx.strokeStyle = grad3;
        //  ctx.fill();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.closePath();
      }

      const finish = performance.now();
      //  console.log("Time = " + (finish - start).toString());
    }
  }
}
