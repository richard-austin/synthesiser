/// <reference lib="webworker" />
addEventListener('message', ({ data }) => {
  const response = `worker response to ${data}`;
  if(data.canvas) {
    const render: Renderer = new Renderer(data.canvas);
    render.drawCalibrations();
    postMessage("terminate");

  }
//  postMessage(response);
});

class Renderer {
  private readonly canvas: HTMLCanvasElement;
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  drawCalibrations() {
    const canvas = this.canvas;
    const ctx = this.canvas.getContext('2d');
    const start = performance.now();
    const radius = 60;
    const centreButtonRadius = radius - 30;
    const skirtInnerRadius = radius - 15;
    const knurlAngle = 5;
    const centreX = canvas.width / 2;
    const centreY = canvas.height / 2;
    const calAngle = 340;
    const divisions = 11;
    const toRads = Math.PI / 180;
    const textPos = -12;

    if (ctx !== null) {
      // Outer edge of skirting
      ctx.beginPath();
      const radGrad = ctx.createRadialGradient(centreX, centreY, skirtInnerRadius, centreX, centreY, radius);
      radGrad.addColorStop(0, "#dca");
      radGrad.addColorStop(1, "#a86");
      ctx.arc(centreX, centreY, radius, 0, 2 * Math.PI, false);
      ctx.lineWidth = 1;
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
        const x = Math.cos(((i / divisions * calAngle) + 90 - calAngle) * toRads) * (radius + textPos) + centreX;
        const y = Math.sin(((i / divisions * calAngle) + 90 - calAngle) * toRads) * (radius + textPos) + centreY;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate((((i + 0.5) / divisions * calAngle) - calAngle / 2) * toRads);
        ctx.fillText((i).toString(), 0, 0);
        ctx.restore();
      }

      const grad3 = ctx.createLinearGradient(centreX-centreButtonRadius, centreY-centreButtonRadius, centreX+centreButtonRadius, centreY+centreButtonRadius);
      grad3.addColorStop(0, "gray");
      grad3.addColorStop(1, "black");

      // Knurling
      for(let angle = 0; angle < 360; angle += knurlAngle) {
        const x1 = centreX+Math.cos(angle* toRads) * (centreButtonRadius);
        const y1 = centreY+Math.sin(angle * toRads) * (centreButtonRadius);
        const x2 = centreX+Math.cos(angle * toRads) * (skirtInnerRadius);
        const y2 = centreY+Math.sin(angle * toRads) * (skirtInnerRadius);
        ctx.beginPath();
        ctx.lineWidth = 1;
        ctx.strokeStyle = grad3;
      //  ctx.fill();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.closePath();
      }

      const finish = performance.now();
      console.log("Time = " + (finish - start).toString());
    }
  }
}
