import { renderGraph } from './graph';

function PerfAnalyzer() {
  this._element = document.createElement('div');
  this._element.className = 'rendering-analyzer-graph-container';
  this._element.style.cssText = `
    position: fixed;
    left: 0px;
    bottom: 0px;
    right: 0px;
    background: rgba(255, 255, 255, 0.8);
    height: 180px;`;

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

  this._showGraph = false;
}

PerfAnalyzer.prototype.showGraph = function(value) {
  this._showGraph = !!value;

  if (this._showGraph) {
    document.addEventListener(
      'DOMContentLoaded',
      function() {
        document.body.appendChild(this._element);
      }.bind(this),
      false
    );
  }
};

PerfAnalyzer.prototype.render = function() {
  renderGraph(
    this._element,
    this._frames,
    this._knownMeasures,
    this._knownEvents
  );
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
    console.warn(
      'PerfAnalyser error: a measurement was started but not ended',
      this._currentMeasureName
    );
    this.endMeasurement();
  }
  if (!this._knownMeasures[name]) {
    this._knownMeasures[name] = {
      color: color
    };
  }

  if (this._currentMeasureName) {
    this._currentFrame.measures[this._currentMeasureName] =
      performance.now() - this._currentMeasureStart;
  }
  this._currentMeasureName = name;
  this._currentMeasureStart = performance.now();
};

PerfAnalyzer.prototype.endMeasurement = function() {
  if (!this._currentMeasureName) {
    console.error(
      "PerfAnalyser error: ending a measurement that hasn't been started"
    );
    return;
  }
  if (!this._currentFrame) {
    console.error(
      'PerfAnalyser error: ending a measurement without a current frame'
    );
    return;
  }

  if (!this._currentFrame.measures[this._currentMeasureName]) {
    this._currentFrame.measures[this._currentMeasureName] = 0;
  }
  this._currentFrame.measures[this._currentMeasureName] +=
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
  if (this._currentMeasureName) {
    console.warn(
      'PerfAnalyser error: a measurement was started but not ended',
      this._currentMeasureName
    );
    this.endMeasurement();
  }

  this._currentFrame.total = performance.now() - this._currentFrameStart;

  // compute remaining (time that was not measured explicitly)
  var rem = this._currentFrame.total;
  Object.keys(this._currentFrame.measures).forEach(
    name => (rem -= this._currentFrame.measures[name])
  );
  this._currentFrame.measures._remaining = rem;

  this._frames.push(this._currentFrame);
  this._currentMeasureName = null;
  this._currentFrame = null;
  this._currentFrameStart = -1;

  if (this._showGraph) {
    this.render();
  }
};

// color must CSS compatible
// char is any kind of text (unicode for symbols)
PerfAnalyzer.prototype.signalEvent = function(name, color, char) {
  if (!this._currentFrame) {
    console.error(
      'PerfAnalyser error: signalling an event without a current frame - ',
      name
    );
    return;
  }

  if (!this._knownEvents[name]) {
    this._knownEvents[name] = {
      color: color,
      char: char
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

PerfAnalyzer.prototype.getFramesData = function() {
  return {
    frames: this._frames
  };
};

export default new PerfAnalyzer();
