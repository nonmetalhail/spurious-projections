import {
  axisBottom,
  axisLeft,
  create,
  format,
  line,
  scaleLinear,
  scaleTime,
  utcFormat
} from './d3_bundle/dist/spd3.js';
import { default as Rough } from '../node_modules/roughjs/bundled/rough.esm.js'

const handwriting = 'Nanum Pen Script';
class Spurious {
  constructor() {
    this.sizing = {
      width: 600,
      height: 350,
      fontSize: 12,
      tickSize: 6,
      margin: 3,
      titleSize: 50
    };
    this.fonts = {
      svgTitle: 25,
      svgBody: 12,
      svgType: 'serif',
      roughTitle: 35,
      roughBody: 20,
      roughType: handwriting
    };

    const myFont = new FontFace(handwriting, "url('https://fonts.googleapis.com/css2?family=Nanum+Pen+Script&display=swap')");
    myFont.load().then((font) => {
      document.fonts.add(font);
    });

    document.getElementById('generate').addEventListener('click', this.createChart.bind(this));
    this.createMeasurementCanvas();

    this.container = document.getElementById('chart-container');

    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.canvas.width = this.sizing.width;
    this.canvas.height = this.sizing.height;
    this.rc = Rough.canvas(this.canvas);

    this.img = document.getElementById('img-container');
  }

  createMeasurementCanvas() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.width = 10;
    ctx.height = 10;
    this._measurementCanvas = ctx;
  }

  getFont(size, type) {
    return `${size}px ${type}`;
  }

  getTitleSize(size, type, title) {
    let current = size + 1;
    let width = Infinity;
    while (width > this.sizing.width || current === 12) {
      this._measurementCanvas.font = this.getFont(--current, type);
      width = this._measurementCanvas.measureText(title).width;
    }
    return current;
  }

  createChart() {
    this.img.innerHTML = '';
    const sketch = document.getElementById('sketch').checked;
    if (sketch) {
      this._measurementCanvas.font = this.getFont(this.fonts.roughBody, this.fonts.roughType);
      this.createRoughChart();
    } else {
      this._measurementCanvas.font = this.getFont(this.fonts.svgBody, this.fonts.svgType);
      this.createSvgChart();
    }
  }

  async createSvgChart() {
    const title = document.getElementById('title').value;
    const value = Number(document.getElementById('value').value);
    const start = document.getElementById('start').value;

    this.svg = create('svg')
      .attr('viewBox', `0 0 ${this.sizing.width} ${this.sizing.height}`)
      .attr('width', this.sizing.width)
      .attr('height', this.sizing.height)
      .attr('style', 'max-width: 100%; height: auto; height: intrinsic;');

    const defs = this.svg.append('defs');
    const marker = defs.append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 0 10 10')
      .attr('refX', 5)
      .attr('refY', 5)
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .attr('orient', 'auto-start-reverse');
    marker.append('path')
      .attr('d', 'M0,0L10,5L0,10 z')

    const yDomain = [-20, 100];
    const bottomMargin = this.sizing.fontSize+this.sizing.tickSize+this.sizing.margin;
    const yStart = this.sizing.height-bottomMargin-this.sizing.titleSize;
    const yRange = [yStart, this.sizing.margin + this.sizing.fontSize/2];
    const yTicks = [value, (100+value)/2,100];
    const maxWidth = yTicks.reduce((acc, val) => {
      return Math.max(this._measurementCanvas.measureText(val).width, acc);
    }, 0);

    const startDate = new Date(start);
    const now = new Date();
    const delta = now - startDate;
    const endDate = new Date(+now + delta);
    const xTicks = [startDate, now, endDate];
    const xDomain = [startDate, endDate];
    const leftMargin = maxWidth + this.sizing.tickSize + this.sizing.margin;
    const xRange = [leftMargin, this.sizing.width-this.sizing.margin-maxWidth/2];

    const xScale = scaleTime()
      .domain(xDomain)
      .range(xRange);
    const yScale = scaleLinear()
      .domain(yDomain)
      .range(yRange);

    const xAxis = axisBottom(xScale)
      .tickValues(xTicks)
      .tickFormat(utcFormat('%Y'));
    const yAxis = axisLeft(yScale)
      .tickValues(yTicks)
      .tickFormat(format('.0f'));

    const x = xScale(now);
    const y = yScale(value);

    const titleSize = this.getTitleSize(this.fonts.svgTitle, this.fonts.svgType, title);
    this.svg.append('text')
      .text(title)
      .attr('x', 0)
      .attr('y', 30)
      .attr('font-size', titleSize);

    const chart = this.svg.append('g')
      .attr('transform', `translate(0,${this.sizing.titleSize})`);
    chart.append('g')
      .attr('transform', `translate(0,${yStart})`)
      .call(xAxis);
    chart.append('g')
      .attr('transform', `translate(${leftMargin},0)`)
      .call(yAxis);

    chart.append('line')
      .attr('x1', xScale(startDate))
      .attr('x2', x)
      .attr('y1', y)
      .attr('y2', y)
      .attr('stroke', 'black')
      .attr('stroke-width', 2);

    chart.append('line')
      .attr('x1', x)
      .attr('x2', xScale(endDate))
      .attr('y1', y)
      .attr('y2', y)
      .attr('stroke', 'black')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', 4);

    chart.append('text')
      .text('Extrapolated from data')
      .attr('x', x)
      .attr('y', y)
      .attr('transform', 'translate(100, -25)');

    const dx = x+30;
    const dy = y-10;
    chart.append('path')
      .attr('d', `M${x+95},${y-30}C ${dx} ${dy-30}, ${dx-5} ${dy+3}, ${dx} ${dy}`)
      .attr('fill', 'none')
      .attr('stroke', 'grey')
      .attr('stroke-width', 1)
      .attr('marker-end', 'url(#arrow)');

    const canvas = await this.placeSvgOnCanvas(this.svg.node());
    this.appendImage(canvas);
  }

  async placeSvgOnCanvas(svg) {
    return new Promise((resolve, reject) => {
      const data = new XMLSerializer().serializeToString(svg);
      const url = `data:image/svg+xml,${encodeURIComponent(data)}`;
      const canvas = document.createElement('canvas');
      canvas.width = this.sizing.width;
      canvas.height = this.sizing.height;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        try {
          ctx.drawImage(img, 0, 0, this.sizing.width, this.sizing.height);
          resolve(canvas);
        } catch(err) {
          reject({error: err});
        }
      }

      img.src = url;
    });
  }

  createRoughChart() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const title = document.getElementById('title').value;
    const value = Number(document.getElementById('value').value);
    const start = document.getElementById('start').value;

    const yDomain = [-20, 100];
    const bottomMargin = this.sizing.fontSize+this.sizing.tickSize+this.sizing.margin;
    const yStart = this.sizing.height-bottomMargin;
    const yRange = [yStart, this.sizing.margin + this.sizing.fontSize/2+this.sizing.titleSize];
    const yTicks = [value, (100+value)/2,100];
    const maxWidth = yTicks.reduce((acc, val) => {
      return Math.max(this._measurementCanvas.measureText(val).width, acc);
    }, 0);

    const startDate = new Date(start);
    const now = new Date();
    const delta = now - startDate;
    const endDate = new Date(+now + delta);
    const xTicks = [startDate, now, endDate];
    const xDomain = [startDate, endDate];
    const leftMargin = maxWidth + this.sizing.tickSize + this.sizing.margin;
    const xRange = [leftMargin, this.sizing.width-this.sizing.margin-maxWidth/2];

    const xScale = scaleTime()
      .domain(xDomain)
      .range(xRange);
    const yScale = scaleLinear()
      .domain(yDomain)
      .range(yRange);

    const titleSize = this.getTitleSize(this.fonts.roughTitle, this.fonts.roughType, title);
    this.ctx.font =  this.getFont(titleSize, this.fonts.roughType);
    this.ctx.fillText(title, 0, 30);

    this.ctx.font = this.getFont(this.fonts.roughBody, this.fonts.roughType);;
    // xAxis
    this.rc.line(xRange[0], yRange[0], xRange[1], yRange[0]);
    for (const tick of xTicks) {
      const pos = xScale(tick);
      const tickValue = tick.getUTCFullYear();
      const offset = this._measurementCanvas.measureText(tickValue).width/2;
      this.rc.line(pos, yRange[0], pos, yRange[0]+6);
      this.ctx.fillText(tickValue, pos-offset, this.sizing.height);
    }

    // yAxis
    this.rc.line(xRange[0], yRange[0], xRange[0], yRange[1]);
    for (const tick of yTicks) {
      const pos = yScale(tick)
      this.rc.line(xRange[0]-6, pos, xRange[0], pos);
      this.ctx.fillText(tick, 0, pos+5);
    }

    const x = xScale(now);
    const y = yScale(value);

    this.rc.line(xRange[0], y, x, y);
    this.rc.line(x, y-1, xRange[1], y-1, {strokeLineDash: [4]});

    this.ctx.fillText('Extrapolated from data', x+100, y-25);
    this.rc.arc(x+95, y-10, 120, 40, Math.PI, Math.PI*3/2, false);
    this.rc.line(x+35, y-10, x+30, y-20);
    this.rc.line(x+35, y-10, x+45, y-15);

    this.appendImage(this.canvas)
  }

  appendImage(canvas) {
    const chart = canvas.toDataURL('image/png');
    const img = new Image(canvas.width, canvas.height);
    img.src = chart;
    this.img.appendChild(img);
  }
}

new Spurious();