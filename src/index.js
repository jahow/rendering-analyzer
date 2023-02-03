import { renderGraph } from './graph';

let containerEl = null

/**
 * @typedef {{classes: Object.<string, ClassStats>, duration: number}} FrameStats
 */
/**
 * @typedef {{instanceCount: number, methods: Object.<string, FunctionStats>, spentTotalMs: number}} ClassStats
 */
/**
 * @typedef {{callCount: number, spentAsyncMs: number, spentSyncMs: number}} FunctionStats
 */

/**
 * @type {FrameStats[]}
 */
const frames = [];

/**
 * @type {FrameStats}
 */
let currentFrame = {
  classes: {},
  duration: 0
};

let currentFrameStart = -1;

/**
 * @type {string[]}
 */
const trackedClasses = ['_remaining']

function newFrame() {
  if (currentFrame) {
    currentFrame.duration = performance.now() - currentFrameStart
    const trackedClassesTotal = Object.keys(currentFrame.classes).reduce((prev, curr) => prev += currentFrame.classes[curr].spentTotalMs, 0)
    currentFrame.classes['_remaining'] = {
      spentTotalMs: currentFrame.duration - trackedClassesTotal,
      instanceCount: 0,
      methods: {}
    }
    frames.push(currentFrame)
  }
  if (containerEl) {
    // graph rendering is out of tracked time
    renderGraph(
      containerEl,
      frames,
      trackedClasses
    );
  }
  currentFrameStart = performance.now()
  currentFrame = {
    classes: {},
    duration: 0
  }
}

/**
 * @param {Class|Object} classOrInstance
 * @param {string} [name]
 */
export function track(classOrInstance, name) {
  const proto = typeof classOrInstance === 'object' ? classOrInstance : classOrInstance.prototype
  const methods = Object.getOwnPropertyNames(proto).filter(prop => typeof proto[prop] === 'function')
  const className = name || classOrInstance.name || '<no name>'
  if (trackedClasses.indexOf(className) === -1) trackedClasses.push(className)
  methods.forEach((methodName) => {
    const originalName = `${methodName}__NOPERFSTATS`
    proto[originalName] = proto[methodName]
    proto[methodName] = function(...args) {
      if (!(className in currentFrame.classes)) currentFrame.classes[className] = {
        methods: {},
        instanceCount: 0,
        spentTotalMs: 0
      }
      const classStats = currentFrame.classes[className]

      if (!(methodName in classStats.methods)) classStats.methods[methodName] = {
        spentSyncMs: 0,
        spentAsyncMs: 0,
        callCount: 0
      }
      const methodStats = classStats.methods[methodName]

      methodStats.callCount++
      const start = performance.now()
      proto[originalName].call(this, ...args)
      const delta = performance.now() - start
      methodStats.spentSyncMs += delta
      classStats.spentTotalMs += delta
    }
  })
}

/**
 * @param {Class|Object} classOrInstance
 * @param {string} methodName
 */
export function defineFrameStart(classOrInstance, methodName) {
  const proto = typeof classOrInstance === 'object' ? classOrInstance : classOrInstance.prototype
  const methods = Object.getOwnPropertyNames(proto).filter(prop => typeof proto[prop] === 'function')
  if (methods.indexOf(methodName) === -1) {
    throw new Error(`perf-analyzer: method #${methodName} not found on ${JSON.stringify(proto)}`)
  }
  const originalName = `${methodName}__NOFRAMESTART`
  proto[originalName] = proto[methodName]
  proto[methodName] = function(...args) {
    newFrame()
    proto[originalName].call(this, ...args)
  }
}

export function showTable() {

}

export function showGraph() {
  containerEl = document.createElement('div');
  containerEl.className = 'rendering-analyzer-graph-container';
  containerEl.style.cssText = `
position: fixed;
left: 0px;
bottom: 0px;
right: 0px;
background: rgba(255, 255, 255, 0.8);
height: 180px;`;
  document.body.appendChild(containerEl);
}

if (typeof globalThis !== 'undefined') {
  globalThis.dumpPerfStats = () => {
    console.dir(frames)
  }
}






