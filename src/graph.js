import * as d3 from 'd3';
import {getCssColorFromString} from './utils'

var svg;
var tooltip;

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
  let padding = 4;
  let framePadding = 1;
  let frameWidth = 4;
  let targetFrameTime = 16.6;
  let maxFrameTime = targetFrameTime * 4;
  let graphWidth = domElement.clientWidth - padding * 2;
  let graphHeight = domElement.clientHeight - padding * 3;
  let maxVisibleFrames = Math.floor(graphWidth / (frameWidth + framePadding));
  let frameOffset = Math.max(0, frames.length - maxVisibleFrames);
  let visibleFrames = frames.slice(frameOffset);
  const knownClasses = trackedClasses.slice().reverse()

  // init
  if (!svg) {
    svg = d3.select(domElement).append('svg');
    svg.append('g').attr('id', 'perfanalyzer-times');

    // target frame time
    var lineY =
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
    .attr('transform', `translate(${padding}, ${padding})`);

  // generate data series for stacked bar chart (keys are added on items)
  var stack = d3
    .stack()
    .keys(knownClasses)
    .value((d, key) => key in d.classes ? d.classes[key].spentTotalMs : 0);
  var framesData = stack(visibleFrames);
  for (let i = 0; i < framesData.length; i++) {
    for (let j = 0; j < framesData[i].length; j++) {
      framesData[i][j].key = `frame${j + frameOffset}`;
    }
  }

  // update stacked bars (times)
  var bars = svg
    .select('g#perfanalyzer-times')
    .selectAll('g.frame-stack')
    .data(framesData);

  // add g for series
  bars
    .enter()
    .append('g')
    .attr('class', 'frame-stack');
  bars.exit().remove();
  bars
    .attr('fill', function(d, i) {
      return getCssColorFromString(d.key);
    })
    .attr(
      'transform',
      `translate(${-frameOffset * (frameWidth + framePadding)}, 0)`
    );

  // add rect for bars inside a series
  bars = bars.selectAll('rect').data(d => d, d => d.key);
  bars.exit().remove();
  bars
    .enter()
    .append('rect')
    .attr('width', frameWidth)
    .attr('height', d => ((d[1] - d[0]) / maxFrameTime) * graphHeight)
    .attr('y', function(d) {
      return (
        graphHeight -
        this.getAttribute('height') -
        (d[0] / maxFrameTime) * graphHeight
      );
    })
    .attr('x', (d, i) => (i + frameOffset) * (frameWidth + framePadding));

  // tooltip
  bars
    .enter()
    .selectAll('rect')
    .on('mouseover', function() {
      tooltip.style('display', null);
    })
    .on('mouseout', function() {
      tooltip.style('display', 'none');
    })
    .on('mousemove', function(d, i) {
      // tooltip content
      var text = `total: ${(d.data.spentSyncMs + d.data.spentAsyncMs).toFixed(1)}`;
      knownClasses.forEach(
        className =>
          (text += `<br><span style="color: ${
            getCssColorFromString(className)
          }">■</span> ${className}: ${(className in d.data.classes ? d.data.classes[className].spentTotalMs : 0).toFixed(1)}`)
      );
      tooltip.html(text);
      tooltip.style('left', `auto`);
      tooltip.style('right', `auto`);

      // update rect & pos
      var halfWidth = tooltip.node().clientWidth / 2;
      var xPos = i * (frameWidth + framePadding) + frameWidth / 2 - halfWidth;
      var yPos =
        Math.min(graphHeight * ((d.data.spentSyncMs + d.data.spentAsyncMs) / maxFrameTime), graphHeight) + 10;
      if (xPos < graphWidth - halfWidth * 2) {
        tooltip.style('left', `${Math.max(0, xPos)}px`);
      } else {
        tooltip.style('right', `0px`);
      }
      tooltip.style('bottom', `${yPos}px`);
    });
}
