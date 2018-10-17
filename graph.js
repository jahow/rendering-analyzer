import * as d3 from 'd3';

var svg;

export function renderGraph(domElement, frames) {
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

  // update bars (times)
  var bars = svg
    .select('g#perfanalyzer-times')
    .attr('fill', 'steelblue')
    .selectAll('rect')
    .data(visibleFrames);

  bars.enter().append('rect');
  bars.exit().remove();
  bars
    .attr('height', d =>
      Math.min((d.total / maxFrameTime) * graphHeight, graphHeight)
    )
    .attr('width', frameWidth)
    .attr('x', (d, i) => i * (frameWidth + framePadding))
    .attr('y', function(d) {
      return graphHeight - this.getAttribute('height');
    });

  // target t
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
