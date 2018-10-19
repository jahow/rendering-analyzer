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
  var frameOffset = Math.max(0, frames.length - maxVisibleFrames);
  var visibleFrames = frames.slice(frameOffset);
  var measureNames = Object.keys(knownMeasures);
  measureNames.push('_remaining');

  // init
  if (!svg) {
    svg = d3.select(domElement).append('svg');
    svg.append('g').attr('id', 'perfanalyzer-times');
    svg.append('g').attr('id', 'perfanalyzer-events');

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
    .attr('height', graphHeight)
    .attr('transform', `translate(${padding}, ${padding})`);

  // generate data series for staked bar chart (keys are added on items)
  var stack = d3
    .stack()
    .keys(measureNames)
    .value((d, key) => d.measures[key] || 0);
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
      return knownMeasures[d.key] ? knownMeasures[d.key].color : 'steelblue';
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
      var text = `total: ${d.data.total.toFixed(1)}`;
      measureNames.forEach(
        name =>
          (text += `<br><span style="color: ${
            knownMeasures[name] ? knownMeasures[name].color : 'steelblue'
          }">■</span> ${name}: ${(d.data.measures[name] || 0).toFixed(1)}`)
      );
      if (Object.keys(d.data.events).length) {
        text += `<br><br>events:`;
        Object.keys(d.data.events).forEach(event => {
          text += `<br> • ${d.data.events[event]} × ${event}`;
        });
      }
      tooltip.html(text);
      tooltip.style('left', `auto`);
      tooltip.style('right', `auto`);

      // update rect & pos
      var halfWidth = tooltip.node().clientWidth / 2;
      var xPos = i * (frameWidth + framePadding) + frameWidth / 2 - halfWidth;
      var yPos =
        Math.min(graphHeight * (d.data.total / maxFrameTime), graphHeight) + 10;
      if (xPos < graphWidth - halfWidth * 2) {
        tooltip.style('left', `${Math.max(0, xPos)}px`);
      } else {
        tooltip.style('right', `0px`);
      }
      tooltip.style('bottom', `${yPos}px`);
    });
}
