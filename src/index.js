import {renderGraph} from './graph'
import {trackExecutionStats} from './tracking'
import {renderTable} from './table'

let renderRootEl = null
let enableGraph = false
let enableTable = false

/**
 * @typedef {{classes: Object.<string, ClassStats>, spentTotalMs: number}} FrameStats
 */
/**
 * @typedef {{methods: Object.<string, FunctionStats>, spentTotalMs: number}} ClassStats
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
 * @typedef {{maxCallCountPerFrame: number, maxSpentPerFrameMs: number, spentTotalMs: number, totalCallCount: number}} FunctionTotalStats
 */
/**
 * @typedef {{instanceCount: number, methods: Object.<string, FunctionTotalStats>}} ClassTotalStats
 */
/**
 * @typedef {{classes: Object.<string, ClassTotalStats>, exceededFrameBudgetCount: number}} TotalStats
 */
/**
 * @type {TotalStats}
 */
const totalStats = {
  exceededFrameBudgetCount: 0,
  classes: {}
}

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

    if (!(className in totalStats.classes)) totalStats.classes[className] = {
      methods: {},
      instanceCount: 0
    }
    const classTotalStats = totalStats.classes[className];
    for (const methodName in classTotalStats.methods) {
      const methodStats = classStats.methods[methodName];
      const methodTotalStats = classTotalStats.methods[methodName];
      if (methodStats && methodStats.callCount > methodTotalStats.maxCallCountPerFrame) {
        methodTotalStats.maxCallCountPerFrame = methodStats.callCount;
      }
      if (methodStats && methodStats.callCount > 0) {
        methodTotalStats.totalCallCount += methodStats.callCount;
      }
      if (methodStats && methodStats.spentTotalMs > methodTotalStats.maxSpentPerFrameMs) {
        methodTotalStats.maxSpentPerFrameMs = methodStats.spentTotalMs;
      }
    }
  }
  if (Math.max(frame.spentTotalMs, trackedClassesTotal) > 16) totalStats.exceededFrameBudgetCount++;
  frame.classes['_remaining'] = {
    spentTotalMs: Math.max(0, frame.spentTotalMs - trackedClassesTotal),
    instanceCount: 0,
    methods: {}
  }

  if (enableGraph) {
    renderGraph(
      getRenderRoot(),
      frames,
      trackedClasses
    );
  }
  if (enableTable) {
    renderTable(
      getRenderRoot(),
      totalStats,
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
    // frame stats
    if (!(className in currentFrame.classes)) currentFrame.classes[className] = {
      methods: {},
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

    // total stats
    if (!(className in totalStats.classes)) totalStats.classes[className] = {
      methods: {},
      instanceCount: 0
    }
    const classTotalStats = totalStats.classes[className]
    if (!(methodName in classTotalStats.methods)) classTotalStats.methods[methodName] = {
      spentTotalMs: 0,
      maxCallCountPerFrame: 0,
      maxSpentPerFrameMs: 0,
      totalCallCount: 0
    }
    const methodTotalStats = classTotalStats.methods[methodName]
    methodTotalStats.spentTotalMs += timeSpentMs
  })
}

function getRenderRoot() {
  if (!renderRootEl) {
    renderRootEl = document.createElement('div');
    renderRootEl.className = 'rendering-analyzer-container';
    renderRootEl.style.cssText = `
position: fixed;
left: 0px;
bottom: 0px;
right: 0px;
display: flex;
flex-direction: column;
justify-content: end;
align-items: end;
pointer-events: none;`;
    document.body.appendChild(renderRootEl);
  }
  return renderRootEl
}

export function showTable() {
  enableTable = true
}

export function showGraph() {
  enableGraph = true
}

export function getFrameStats() {
  return [...frames]
}

if (typeof globalThis !== 'undefined') {
  globalThis.dumpPerfStats = () => {
    console.dir(frames)
  }
}






