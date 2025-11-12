/// <reference lib="webworker" />
import {interval} from 'rxjs';

addEventListener('message', ({ data }) => {
  const response = `worker response to ${data}`;
  if(data.canvas) {
    const render: Renderer = new Renderer(data.canvas);
    let angle = 0;
    interval(10).subscribe(() => {
      render.drawDial(angle);
      angle += 1;
    });
    //render.drawDial(angle);
   // postMessage("terminate");

  }
//  postMessage(response);
});

class Renderer {
  private readonly canvas: HTMLCanvasElement;
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  drawDial(angle: number) {
    const canvas = this.canvas;
    const ctx = this.canvas.getContext('2d');
    const start = performance.now();
    const radius = 50;
    const centreButtonRadius = radius - 18;
    const skirtInnerRadius = radius - 25;
    const knurlAngle = 6;
    const centreX = canvas.width / 2;
    const centreY = canvas.height / 2;
    const calAngle = 350;
    const align = calAngle - 90;  // Align zero position
    const divisions = 11;
    const toRads = Math.PI / 180;
    const textPos = -15;

    if (ctx !== null) {
      // Outer edge of skirting
      ctx.beginPath();
      const radGrad = ctx.createRadialGradient(centreX, centreY, skirtInnerRadius, centreX, centreY, radius);
      radGrad.addColorStop(0, "#dca");
      radGrad.addColorStop(1, "#a86");
      ctx.arc(centreX, centreY, radius, 0, 2 * Math.PI, false);
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
      ctx.arc(centreX, centreY, skirtInnerRadius, 0, 2 * Math.PI, false);
      ctx.fill();
      ctx.stroke();
      ctx.closePath();

      // Create linear gradient
      const grad = ctx.createLinearGradient(centreX-centreButtonRadius, centreY-centreButtonRadius, centreX+centreButtonRadius, centreY+centreButtonRadius);
      grad.addColorStop(0, "lightblue");
      grad.addColorStop(1, "darkblue");

      // Center button
      ctx.beginPath();
      ctx.arc(centreX, centreY, centreButtonRadius, 0, 2 * Math.PI, false);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.stroke();
      ctx.closePath();

      ctx.textAlign = 'center';
      ctx.font = '16x Arial';
      ctx.fillStyle = '#000';

      // Calibrations
      for (let i = 0; i < divisions; ++i) {
        const x = Math.cos(((i / divisions * calAngle) + align - calAngle +angle) * toRads) * (radius + textPos) + centreX;
        const y = Math.sin(((i / divisions * calAngle) + align - calAngle +angle) * toRads) * (radius + textPos) + centreY;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(((i / divisions * calAngle) - calAngle + align + 90 + angle) * toRads);
        ctx.fillText((i).toString(), 0, 0);
        ctx.restore();
      }

      const grad3 = ctx.createLinearGradient(centreX-centreButtonRadius, centreY-centreButtonRadius, centreX+centreButtonRadius, centreY+centreButtonRadius);
      grad3.addColorStop(0, "gray");
      grad3.addColorStop(1, "black");

      // Knurling
      for(let knurl = 0; knurl < 360; knurl += knurlAngle) {
        const x1 = centreX+Math.cos((knurl+angle) * toRads) * (centreButtonRadius);
        const y1 = centreY+Math.sin((knurl+angle) * toRads) * (centreButtonRadius);
        const x2 = centreX+Math.cos((knurl+angle) * toRads) * (skirtInnerRadius);
        const y2 = centreY+Math.sin((knurl+angle) * toRads) * (skirtInnerRadius);
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
