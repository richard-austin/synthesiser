/// <reference lib="webworker" />

import {ElementRef} from '@angular/core';

addEventListener('message', ({ data }) => {
  const response = `worker response to ${data}`;
  if(data.canvas) {
    const render: Renderer = new Renderer(data.canvas);


  }
  postMessage(response);
});

class Renderer {
  private readonly canvas: HTMLCanvasElement;
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.drawCalibrations();
  }

  drawCalibrations() {
    const canvas = this.canvas;
    const ctx = this.canvas.getContext('2d');
    const start = performance.now();
    const radius = 65;
    const centreX = canvas.width / 2;
    const centreY = canvas.height / 2;
    const calAngle = 340;
    const divisions = 20;
    const toRads = Math.PI / 180;
    if (ctx !== null) {
      ctx.beginPath();
      const radGrad = ctx.createRadialGradient(centreX, centreY, radius - 6, centreX, centreY, radius + 6);
      radGrad.addColorStop(0, "#dca");
      radGrad.addColorStop(1, "#a86");
      ctx.lineWidth = 55;
      ctx.strokeStyle = radGrad;
      // ctx.moveTo(centreX, centreY);
      ctx.arc(centreX, centreY, radius + 3, 0, 2 * Math.PI, false);
      ctx.stroke();
      ctx.closePath();

      // Create linear gradient
      const grad1 = ctx.createLinearGradient(0, 0, 0, 130);
      grad1.addColorStop(0, "green");
      grad1.addColorStop(1, "darkgray");

      ctx.beginPath();
      ctx.strokeStyle = '#333';
      //ctx.moveTo(centreX, centreY);
      ctx.lineWidth = 1;
      ctx.fillStyle = grad1;
      ctx.arc(centreX, centreY, radius - 10, 0, 2 * Math.PI, false);
      ctx.fill();
      ctx.stroke();
      ctx.closePath();

      // Create linear gradient
      const grad = ctx.createLinearGradient(0, 0, 0, 130);
      grad.addColorStop(0, "lightblue");
      grad.addColorStop(1, "darkblue");

      ctx.beginPath();
      ctx.arc(centreX, centreY, radius - 30, 0, 2 * Math.PI, false);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.stroke();
      ctx.closePath();

      ctx.textAlign = 'center';
      ctx.font = '16x Arial';
      ctx.fillStyle = '#000';
      const textPos = 15;
      for (let i = 0; i < divisions; ++i) {
        const x = Math.cos(((i / divisions * calAngle) + 90 - calAngle) * toRads) * (radius + textPos) + centreX;
        const y = Math.sin(((i / divisions * calAngle) + 90 - calAngle) * toRads) * (radius + textPos) + centreY;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate((((i + 0.5) / divisions * calAngle) - calAngle / 2) * toRads);
        ctx.fillText((i + 1).toString(), 0, 0);
        ctx.restore();
      }

      const finish = performance.now();
      console.log("Time = " + (finish - start).toString());
    }
  }
}
