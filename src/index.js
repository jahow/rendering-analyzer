import {renderGraph} from './graph'
import {trackExecutionStats} from './tracking'

let containerEl = null

/**
 * @typedef {{classes: Object.<string, ClassStats>, spentTotalMs: number}} FrameStats
 */
/**
 * @typedef {{instanceCount: number, methods: Object.<string, FunctionStats>, spentTotalMs: number}} ClassStats
 */
/**
 * @typedef {{callCount: number, spentTotalMs: number}} FunctionStats
 */

/**
 * @type {FrameStats}
 */
let currentFrame = {
  classes: {},
  duration: 0
};

/**
 * @type {FrameStats[]}
 */
const frames = [currentFrame];

/**
 * @type {string[]}
 */
const trackedClasses = ['_remaining']

function newFrame() {
  closeFrame(currentFrame)
  currentFrame = {
    classes: {},
    spentTotalMs: 0
  }
  frames.push(currentFrame)
}

function closeFrame(frame) {
  let trackedClassesTotal = 0
  for (const className in frame.classes) {
    const classStats = frame.classes[className]
    const methodsTotal = Object.keys(classStats.methods).reduce((prev, curr) => prev + classStats.methods[curr].spentTotalMs, 0)
    classStats.spentTotalMs = methodsTotal
    trackedClassesTotal += methodsTotal
  }
  frame.classes['_remaining'] = {
    spentTotalMs: Math.max(0, frame.spentTotalMs - trackedClassesTotal),
    instanceCount: 0,
    methods: {}
  }
  if (containerEl) {
    renderGraph(
      containerEl,
      frames,
      trackedClasses
    );
  }
}

/**
 * @param {Class|Object} classOrInstance
 * @param {string} methodName
 */
export function defineFrameContainer(classOrInstance, methodName) {
  trackExecutionStats(classOrInstance, (timeSpentMs, totalSpentMs, methodName, invoked) => {
    if (invoked) {
      newFrame()
    }
    currentFrame.spentTotalMs += totalSpentMs
  }, methodName)
}

/**
 * @param {Class|Object} classOrInstance
 * @param {string} [name]
 */
export function trackPerformance(classOrInstance, name) {
  const className = name || classOrInstance.name || '<no name>'
  if (trackedClasses.indexOf(className) === -1) trackedClasses.push(className)

  trackExecutionStats(classOrInstance, (timeSpentMs, totalSpentMs, methodName, invoked) => {
    if (!(className in currentFrame.classes)) currentFrame.classes[className] = {
      methods: {},
      instanceCount: 0,
      spentTotalMs: 0
    }
    const classStats = currentFrame.classes[className]
    if (!(methodName in classStats.methods)) classStats.methods[methodName] = {
      spentTotalMs: 0,
      callCount: 0
    }
    const methodStats = classStats.methods[methodName]
    methodStats.spentTotalMs += timeSpentMs
    if (invoked) methodStats.callCount++
  })
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
height: 320px;`;
  document.body.appendChild(containerEl);
}

export function getFrameStats() {
  return [...frames]
}

if (typeof globalThis !== 'undefined') {
  globalThis.dumpPerfStats = () => {
    console.dir(frames)
  }
}






