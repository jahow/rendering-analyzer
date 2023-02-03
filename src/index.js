import { renderGraph } from './graph';

let containerEl = null

/**
 * @typedef {{classes: Object.<string, ClassStats>, spentAsyncMs: number, spentSyncMs: number}} FrameStats
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

function closeCurrentFrame() {
  const trackedClassesTotal = Object.keys(currentFrame.classes).reduce((prev, curr) => prev += currentFrame.classes[curr].spentTotalMs, 0)
  currentFrame.classes['_remaining'] = {
    spentTotalMs: currentFrame.spentAsyncMs + currentFrame.spentSyncMs - trackedClassesTotal,
    instanceCount: 0,
    methods: {}
  }
}

function newFrame() {
  if (containerEl) {
    renderGraph(
      containerEl,
      frames,
      trackedClasses
    );
  }
  closeCurrentFrame()
  currentFrameStart = performance.now()
  currentFrame = {
    classes: {},
    spentSyncMs: 0,
    spentAsyncMs: 0
  }
  frames.push(currentFrame)
}

/**
 * @param {Class|Object} classOrInstance
 * @param {string} [name]
 */
export function trackPerformance(classOrInstance, name) {
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

      // track async code through setTimeout
      const setTimeout_original = globalThis.setTimeout
      globalThis.setTimeout = function(callback, delay, ...params) {
        setTimeout_original((...args) => {
          const start = performance.now()
          callback(...args)
          const delta = performance.now() - start
          methodStats.spentAsyncMs += delta
          classStats.spentTotalMs += delta
        }, delay, ...params)
      }

      methodStats.callCount++
      const start = performance.now()
      const result = proto[originalName].apply(this, args)
      const delta = performance.now() - start
      methodStats.spentSyncMs += delta
      classStats.spentTotalMs += delta

      globalThis.setTimeout = setTimeout_original

      return result
    }
  })
}

/**
 * @param {Class|Object} classOrInstance
 * @param {string} methodName
 */
export function defineFrameContainer(classOrInstance, methodName) {
  const proto = typeof classOrInstance === 'object' ? classOrInstance : classOrInstance.prototype
  const methods = Object.getOwnPropertyNames(proto).filter(prop => typeof proto[prop] === 'function')
  if (methods.indexOf(methodName) === -1) {
    throw new Error(`perf-analyzer: method #${methodName} not found on ${JSON.stringify(proto)}`)
  }
  const originalName = `${methodName}__NOFRAMESTART`
  proto[originalName] = proto[methodName]
  proto[methodName] = function(...args) {
    newFrame()
    const start = performance.now()

    // track async code through setTimeout
    const setTimeout_original = globalThis.setTimeout
    globalThis.setTimeout = function(callback, delay, ...params) {
      setTimeout_original((...args) => {
        const start = performance.now()
        callback(...args)
        const delta = performance.now() - start
        currentFrame.spentAsyncMs += delta
      }, delay, ...params)
    }

    const result = proto[originalName].call(this, ...args)
    const delta = performance.now() - start
    currentFrame.spentSyncMs += delta

    globalThis.setTimeout = setTimeout_original

    return result
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






