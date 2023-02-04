import {renderGraph} from './graph'
import 'zone.js'

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

let currentFrameStart = -1;

/**
 * @type {FrameStats[]}
 */
const frames = [currentFrame];

/**
 * @type {string[]}
 */
const trackedClasses = ['_remaining']

function newFrame() {
  currentFrameStart = performance.now()
  currentFrame = {
    classes: {},
    spentTotalMs: 0
  }
  frames.push(currentFrame)
  return currentFrame
}

function closeFrame(frame) {
  let trackedClassesTotal = 0
  for (const className in frame.classes) {
    const classStats = frame.classes[className]
    const methodsTotal = Object.keys(classStats.methods).reduce((prev, curr) => prev += classStats.methods[curr].spentTotalMs, 0)
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

// const methodTimingZone = Zone.current.fork({
//   name: 'classMethod',
//   properties: {
//     methodStats: null,
//     classStats: null,
//     className: null,
//     methodName: null
//   },
//   onInvoke: function(parent, currentZone, targetZone, delegate, applyThis, applyArgs, source) {
//     const start = performance.now()
//     const result = parent.invoke(targetZone, delegate, applyThis, applyArgs, source);
//     const delta = performance.now() - start
//     targetZone.get('methodStats').spentTotalMs += delta
//     targetZone.get('methodStats').callCount++
//     targetZone.get('classStats').spentTotalMs += delta
//     return result
//   },
//   // onFork: function(parent, currentZone, targetZone, zoneSpec) {
//   //   return parent.fork(targetZone, zoneSpec);
//   // }
// })

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
    closeFrame(currentFrame)
    const frame = newFrame()
    const zone = Zone.current.fork({
      name: 'frameTiming',
      onInvoke: function(parent, currentZone, targetZone, delegate, applyThis, applyArgs, source) {
        const start = performance.now()
        const result = parent.invoke(targetZone, delegate, applyThis, applyArgs, source);
        const delta = performance.now() - start
        frame.spentTotalMs += delta
        return result
      },
      onInvokeTask: function(parent, currentZone, targetZone, task, applyThis, applyArgs) {
        const start = performance.now()
        const result = parent.invokeTask(targetZone, task, applyThis, applyArgs);
        const delta = performance.now() - start
        frame.spentTotalMs += delta
        return result;
      },
      // onHasTask: (parent, currentZone, targetZone, hasTaskState) => {
      //   if (!hasTaskState.microTask && !hasTaskState.macroTask){
      //     closeFrame(frame)
      //   }
      // },
      onHandleError: function (parentZoneDelegate, currentZone, targetZone, error) {
        console.error(error.stack);
      }
    })
    return zone.runGuarded(proto[originalName], this, args)
  }
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
        spentTotalMs: 0,
        callCount: 0
      }
      const methodStats = classStats.methods[methodName]

      const zone = Zone.current.fork({
        name: 'classMethod',
        properties: {
          // substractTime(delta) {
          //   methodStats.spentTotalMs -= delta
          // },
          // checkNested() {
          //   console.log(zoneThis.parent)
          // }
        },
        onInvoke: function(parent, currentZone, targetZone, delegate, applyThis, applyArgs, source) {
          // console.log(`on invoke for ${targetZone.get('className')}#${targetZone.get('methodName')}`)
          const start = performance.now()
          const result = parent.invoke(targetZone, delegate, applyThis, applyArgs, source);
          const delta = performance.now() - start
          methodStats.spentTotalMs += delta
          methodStats.callCount++
          // if (delta > 0 && typeof parent.zone.get('substractTime') === 'function') {
          //   parent.zone.get('substractTime')(delta)
          // }
          return result
        },
        onInvokeTask: function(parent, currentZone, targetZone, task, applyThis, applyArgs) {
          // console.log(`on invoke for ${targetZone.get('className')}#${targetZone.get('methodName')}`)
          const start = performance.now()
          const result = parent.invokeTask(targetZone, task, applyThis, applyArgs);
          const delta = performance.now() - start
          methodStats.spentTotalMs += delta
          methodStats.callCount++
          // if (delta > 0 && typeof parent.zone.get('substractTime') === 'function') {
          //   parent.zone.get('substractTime')(delta)
          // }
          return result
        },
        onHandleError: function (parentZoneDelegate, currentZone, targetZone, error) {
          console.error(error.stack);
        }
        // onHasTask: (parent, currentZone, targetZone, hasTaskState) => {
        //   if (!hasTaskState.microTask && !hasTaskState.macroTask) {
        //     const methodsTotal = Object.keys(classStats.methods).reduce((prev, curr) => prev += classStats.methods[curr].spentTotalMs, 0)
        //     classStats.spentTotalMs = methodsTotal
        //   }
        //   parent.hasTask(targetZone, hasTaskState)
        // },
      })

      return zone.runGuarded(proto[originalName], this, args)
    }
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
height: 180px;`;
  document.body.appendChild(containerEl);
}

if (typeof globalThis !== 'undefined') {
  globalThis.dumpPerfStats = () => {
    console.dir(frames)
  }
}






