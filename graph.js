import * as d3 from 'd3';
import * as Utils from './utils';

var svg;

export function renderGraph(domElement, frames, knownMeasures, knownEvents) {
  if (!domElement || !domElement.clientWidth) {
    return;
  }

  // init
  if (!svg) {
    svg = d3.select(domElement).append('svg');
    svg.append('g').attr('id', 'perfanalyzer-times');
    svg.append('g').attr('id', 'perfanalyzer-events');
    svg.append('line').attr('id', 'perfanalyzer-target-time');
  }

  // params
  var padding = 8;
  var targetFrameTime = 16.6;
  var maxFrameTime = targetFrameTime * 4;
  var graphWidth = domElement.clientWidth - padding * 2;
  var graphHeight = domElement.clientHeight - padding * 2;
  var frameWidth = 4;
  var framePadding = 1;
  var maxVisibleFrames = Math.floor(graphWidth / (frameWidth + framePadding));
  var visibleFrames =
    frames.length > maxVisibleFrames
      ? frames.slice(frames.length - maxVisibleFrames, frames.length - 1)
      : frames;

  // update size
  svg
    .attr('width', graphWidth)
    .attr('height', graphHeight)
    .attr('transform', `translate(${padding}, ${padding})`);

  // data preparation: compute remaining time, computeeasure colors, names list
  var measureNames = Object.keys(knownMeasures);
  visibleFrames.forEach(function(frame) {
    frame.measures._remaining = frame.total;
    Object.keys(frame.measures).forEach(name => {
      frame.measures._remaining -= frame.measures[name];
      if (measureNames.indexOf(name) === -1) {
        measureNames.push(name);
      }
    });
  });

  // update stacked bars (times)
  var stack = d3
    .stack()
    .keys(measureNames)
    .value((d, key) => d.measures[key] || 0);
  var framesData = stack(visibleFrames);
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
  bars.attr('fill', function(d, i) {
    return knownMeasures[d.key] ? knownMeasures[d.key].color : 'steelblue';
  });

  // add rect for bars inside a series
  bars = bars.selectAll('rect').data(d => d);
  bars.enter().append('rect');
  bars.exit().remove();
  bars
    .attr('height', d => (d[1] / maxFrameTime) * graphHeight)
    .attr('width', frameWidth)
    .attr('x', (d, i) => i * (frameWidth + framePadding))
    .attr('y', function(d) {
      return (
        graphHeight -
        this.getAttribute('height') -
        (d[0] / maxFrameTime) * graphHeight
      );
    });

  // target frame time
  var lineY =
    Math.round(graphHeight * (1 - targetFrameTime / maxFrameTime) + 0.5) - 0.5;
  svg
    .select('line#perfanalyzer-target-time')
    .attr('stroke', 'red')
    .attr('x1', 0)
    .attr('x2', graphWidth)
    .attr('y1', lineY)
    .attr('y2', lineY);
}
