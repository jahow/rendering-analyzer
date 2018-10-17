import { renderGraph } from './graph';

function PerfAnalyzer() {
  this._element = document.createElement('div');
  this._element.className = 'rendering-analyzer-graph-container';
  this._element.style.cssText = `
    position: fixed;
    left: 5px;
    bottom: 5px;
    right: 5px;
    background: rgba(255, 255, 255, 0.8);
    height: 150px;`;

  document.addEventListener(
    'DOMContentLoaded',
    function() {
      document.body.appendChild(this._element);
      console.log('PerfAnalyzer graph was added to the page.');
    }.bind(this),
    false
  );

  // each entry will hold the keys `measures` and `events`
  this._frames = [];
  this._currentFrameStart = -1;
  this._currentFrame = null;
  this._currentMeasureName = null;
  this._currentMeasureStart = -1;

  // measure colors
  this._knownMeasures = {};

  // events colors & shapes
  this._knownEvents = {};

  requestAnimationFrame(this.render.bind(this));

  console.log('PerfAnalyzer object was correctly initialized.');
}

PerfAnalyzer.prototype.render = function() {
  renderGraph(this._element, this._frames);
};

// PUBLIC API

// color must CSS compatible
PerfAnalyzer.prototype.beginMeasurement = function(name, color) {
  if (!this._currentFrame) {
    console.error(
      'PerfAnalyser error: starting a measurement without a current frame - ',
      name
    );
    return;
  }
  if (this._currentMeasureName) {
    console.error(
      'PerfAnalyser error: starting a measurement while another one is running - ',
      name
    );
    return;
  }
  if (!this._knownMeasures[name]) {
    this._knownMeasures[name] = {
      color: color
    };
  }

  if (this._currentMeasureName) {
    this._currentFrame.measures[_currentMeasureName] =
      performance.now() - this._currentMeasureStart;
  }
  this._currentMeasureName = name;
  this._currentMeasureStart = performance.now();
};

PerfAnalyzer.prototype.endMeasurement = function(name) {
  if (!this._currentMeasureName) {
    console.error(
      "PerfAnalyser error: ending a measurement that hasn't been started - ",
      name
    );
    return;
  }
  if (this._currentMeasureName !== name) {
    console.error(
      'PerfAnalyser error: ending a measurement different than the one started - ',
      name
    );
    return;
  }
  if (!this._currentFrame) {
    console.error(
      'PerfAnalyser error: ending a measurement without a current frame - ',
      name
    );
    return;
  }

  if (!this._currentFrame.measures[_currentMeasureName]) {
    this._currentFrame.measures[_currentMeasureName] = 0;
  }
  this._currentFrame.measures[_currentMeasureName] +=
    performance.now() - this._currentMeasureStart;
  this._currentMeasureName = null;
  this._currentMeasureStart = -1;
};

PerfAnalyzer.prototype.startFrame = function() {
  if (!this._currentFrame) {
    this._currentFrame = {
      measures: {},
      events: {},
      total: -1
    };
  }
  this._currentFrameStart = performance.now();
};

PerfAnalyzer.prototype.endFrame = function() {
  this._currentFrame.total = performance.now() - this._currentFrameStart;
  this._frames.push(this._currentFrame);
  this._currentMeasureName = null;
  this._currentFrame = null;
  this._currentFrameStart = -1;

  this.render();
};

// color must CSS compatible
// shape is 'square', 'diamond', 'circle'
PerfAnalyzer.prototype.signalEvent = function(name, color, shape) {
  if (!this._currentFrame) {
    console.error(
      'PerfAnalyser error: signalling an event without a current frame - ',
      name
    );
  }

  if (!this._knownEvents[name]) {
    this._knownEvents[name] = {
      color: color,
      shape: shape
    };
  }

  if (!this._currentFrame.events[name]) {
    this._currentFrame.events[name] = 0;
  }
  this._currentFrame.events[name]++;
};

// Report is printed to the console
// time is the span to print (optional)
PerfAnalyzer.prototype.printReport = function(time) {};

// global
window.PERF_ANALYZER = new PerfAnalyzer();
