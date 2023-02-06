import * as d3 from 'd3';
import {getCssColorFromString} from './utils'

let svg;
let tooltip;
let previousLength = 0

/**
 *
 * @param {HTMLElement} domElement
 * @param {FrameStats[]} frames
 * @param {string[]} trackedClasses
 */
export function renderGraph(domElement, frames, trackedClasses) {
  if (!domElement || !domElement.clientWidth) {
    return;
  }

  // params
  const padding = 4;
  const framePadding = 1;
  const frameWidth = 4;
  const targetFrameTime = 16.6;
  const maxFrameTime = targetFrameTime * 6;
  let graphWidth = domElement.clientWidth - padding * 2;
  let graphHeight = domElement.clientHeight - padding * 3;

  let maxVisibleFrames = Math.floor(graphWidth / (frameWidth + framePadding));
  let frameOffset = Math.max(0, frames.length - maxVisibleFrames);
  const newFrames = frames.slice(previousLength)
  previousLength = frames.length
  const knownClasses = trackedClasses.slice().reverse()

  // init
  if (!svg) {
    svg = d3.select(domElement).append('svg');
    svg.attr('transform', `translate(${padding}, ${padding})`);
    svg.append('g').attr('id', 'perfanalyzer-times');

    // target frame time
    let lineY =
      Math.round(graphHeight * (1 - targetFrameTime / maxFrameTime) + 0.5) -
      0.5;
    svg
      .append('line')
      .attr('id', 'perfanalyzer-target-time')
      .attr('stroke', 'red')
      .attr('x1', 0)
      .attr('x2', graphWidth)
      .attr('y1', lineY)
      .attr('y2', lineY);

    // tooltip
    tooltip = d3
      .select(domElement)
      .append('div')
      .attr('id', 'perfanalyzer-tooltip')
      .style('color', 'white')
      .style('background-color', 'rgba(0, 0, 0, 0.65)')
      .style('position', 'absolute')
      .style('bottom', 0)
      .style('left', 0)
      .style('padding', '4px')
      .style('font-size', '11px')
      .style('font-family', 'monospace')
      .style('pointer-events', 'none')
      .style('display', 'none');
  }

  // update size
  svg
    .attr('width', graphWidth)
    .attr('height', graphHeight + framePadding)

  // generate data series for stacked bar chart (keys are added on items)
  let stack = d3
    .stack()
    .keys(knownClasses)
    .value((d, key) => key in d.classes ? d.classes[key].spentTotalMs : 0);
  let framesData = stack(newFrames);

  const container = svg.node().getElementById('perfanalyzer-times')
  container.setAttribute('transform',`translate(${-padding - frameOffset * (frameWidth + framePadding)}, 0)`);

  function handleMouseOver() {
    tooltip.style('display', null);
  }
  function handleMouseOut() {
    tooltip.style('display', 'none');
  }
  function handleMouseMove() {
    const data = this.frameData

    // tooltip content
    let text = `total: ${data.spentTotalMs.toFixed(1)}`;
    knownClasses.forEach(
      className =>
        (text += `<br><span style="color: ${
          getCssColorFromString(className)
        }">■</span> ${className}: ${(className in data.classes ? data.classes[className].spentTotalMs : 0).toFixed(1)}`)
    );
    tooltip.html(text);
    tooltip.style('left', `auto`);
    tooltip.style('right', `auto`);

    // update rect & pos
    let halfWidth = tooltip.node().clientWidth / 2;
    let xPos = parseFloat(this.getAttribute('x')) + frameWidth / 2 - halfWidth;
    let yPos =
      Math.min(graphHeight * (data.spentTotalMs / maxFrameTime), graphHeight) + 10;
    if (xPos < graphWidth - halfWidth * 2) {
      tooltip.style('left', `${Math.max(0, xPos)}px`);
    } else {
      tooltip.style('right', `0px`);
    }
    tooltip.style('bottom', `${yPos}px`);
  }

  for (let i = 0; i < framesData.length; i++) {
    const series = framesData[i]
    container.append(...series.map((data, i) => {
      const rectEl = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      const height = Math.max(0, ((data[1] - data[0]) / maxFrameTime) * graphHeight)
      rectEl.setAttribute('width', frameWidth.toString())
      rectEl.setAttribute('height', height.toString())
      rectEl.setAttribute('fill', getCssColorFromString(series.key))
      rectEl.setAttribute('y', (graphHeight - height - (data[0] / maxFrameTime) * graphHeight).toString());
      rectEl.setAttribute('x', ((i + previousLength) * (frameWidth + framePadding)).toString());
      rectEl.frameData = data.data;
      rectEl.addEventListener('mouseover', handleMouseOver)
      rectEl.addEventListener('mouseout', handleMouseOut)
      rectEl.addEventListener('mousemove', handleMouseMove)
      return rectEl
    }))
  }
}
