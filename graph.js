import * as d3 from 'd3';
import * as Utils from './utils';

var svg;
var tooltip;

export function renderGraph(domElement, frames, knownMeasures, knownEvents) {
  if (!domElement || !domElement.clientWidth) {
    return;
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
  var measureNames = Object.keys(knownMeasures);
  measureNames.push('_remaining');

  // init
  if (!svg) {
    svg = d3.select(domElement).append('svg');
    svg.append('g').attr('id', 'perfanalyzer-times');
    svg.append('g').attr('id', 'perfanalyzer-events');

    // update size
    svg
      .attr('width', graphWidth)
      .attr('height', graphHeight)
      .attr('transform', `translate(${padding}, ${padding})`);

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

    tooltip = d3
      .select(domElement)
      .append('div')
      .attr('id', 'perfanalyzer-tooltip')
      .attr('width', 100)
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

  // data preparation: compute remaining time
  visibleFrames
    .filter(frame => frame.measures._remaining === undefined)
    .forEach(function(frame) {
      var rem = frame.total;
      Object.keys(frame.measures).forEach(name => {
        rem -= frame.measures[name];
      });
      frame.measures._remaining = rem;
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
    .attr('height', d => ((d[1] - d[0]) / maxFrameTime) * graphHeight)
    .attr('width', frameWidth)
    .attr('x', (d, i) => i * (frameWidth + framePadding))
    .attr('y', function(d) {
      return (
        graphHeight -
        this.getAttribute('height') -
        (d[0] / maxFrameTime) * graphHeight
      );
    });

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
      var text = `total: ${d.data.total.toFixed(1)}`;
      measureNames.forEach(
        name =>
          (text += `<br>${name}: ${(d.data.measures[name] || 0).toFixed(1)}`)
      );
      tooltip.html(text);

      // update rect & pos
      var tooltipRect = tooltip.select('rect');
      var xPosition = i * (frameWidth + framePadding) + frameWidth / 2 - 50;
      var yPosition =
        Math.min(graphHeight * (d.data.total / maxFrameTime), graphHeight) + 10;
      tooltip.style('transform', `translate(${xPosition}px,${-yPosition}px)`);
    });
}
