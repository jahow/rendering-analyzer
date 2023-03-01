import 'zone.js'

/**
 * @param {Class|Object} classOrInstance
 */
export function clearTracking(classOrInstance) {
  const proto = typeof classOrInstance === 'object' ? classOrInstance : classOrInstance.prototype
  const methods = Object.getOwnPropertyNames(proto).filter(prop => typeof proto[prop] === 'function')

  function clean(prefix) {
    methods.forEach((methodName) => {
      const originalName = `${methodName}${prefix}`
      if (typeof proto[originalName] === 'undefined') return;
      proto[methodName] = proto[originalName]
      delete proto[originalName]
    })
  }
  clean('__NOPERFSTATS')
  clean('__NOINSTCOUNT')
  clearTimeout(proto.__INSTCOUNTTIMEOOUT)
}

/**
 * The tracking callback will be called whenever an execution task ends.
 * IMPORTANT: this cannot track time spent in the constructor!
 * @param {Class|Object} classOrInstance
 * @param {(spentSelfMs: number, spentTotalMs: number, methodName: string, invoked: boolean, invocationContext: Object) => void} trackCallback
 * @param {string} [singleMethodName]
 */
export function trackExecutionStats(classOrInstance, trackCallback, singleMethodName) {
  const proto = typeof classOrInstance === 'object' ? classOrInstance : classOrInstance.prototype
  const methods = Object.getOwnPropertyNames(proto).filter(prop => typeof proto[prop] === 'function')
  const className = classOrInstance.name || 'UnnamedObject'

  if (singleMethodName && methods.indexOf(singleMethodName) === -1) {
    throw new Error(`perf-analyzer: method #${singleMethodName} not found on ${JSON.stringify(proto)}`)
  }

  methods.forEach((methodName) => {
    if (singleMethodName && singleMethodName !== methodName) return;

    const originalName = `${methodName}__NOPERFSTATS`
    proto[originalName] = proto[methodName]

    proto[methodName] = function(...args) {
      let invocationContext = {}
      const zone = Zone.current.fork({
        name: `tracking-${className}#${methodName}`,
        properties: {
          reportTimeSpentOutside(deltaMs) {
            trackCallback(-deltaMs, 0, methodName, false, invocationContext)
          }
        },
        onInvoke: function(parent, currentZone, targetZone, delegate, applyThis, applyArgs, source) {
          const isTargetZone = currentZone === targetZone
          // do not track time on promise tasks or not on target zone
          if (!applyThis || !isTargetZone) {
            return parent.invoke(targetZone, delegate, applyThis, applyArgs, source);
          }
          const start = performance.now()
          const result = parent.invoke(targetZone, delegate, applyThis, applyArgs, source);
          const delta = performance.now() - start
          if (delta > 0 && typeof parent.zone.get('reportTimeSpentOutside') === 'function') {
            parent.zone.get('reportTimeSpentOutside')(delta)
          }
          trackCallback(delta, delta, methodName, true, invocationContext)
          return result
        },
        onInvokeTask: function(parent, currentZone, targetZone, task, applyThis, applyArgs) {
          // event tasks are not tracked as they contain macro tasks
          if (task.type === 'eventTask') {
            return parent.invokeTask(targetZone, task, applyThis, applyArgs);
          }
          const start = performance.now()
          const result = parent.invokeTask(targetZone, task, applyThis, applyArgs);
          const delta = performance.now() - start
          if (delta > 0 && typeof parent.zone.get('reportTimeSpentOutside') === 'function') {
            parent.zone.get('reportTimeSpentOutside')(delta)
          }
          trackCallback(delta, delta, methodName, false, invocationContext)
          return result
        },
        onHandleError: function (parentZoneDelegate, currentZone, targetZone, error) {
          console.error(error.stack);
        }
      })
      return zone.runGuarded(proto[originalName], this, args)
    }
    Object.defineProperty(proto[methodName], 'name', {value: methodName, writable: false})
  })
}

/**
 * The tracking callback will be called whenever the instance count changes
 * @param {Class} trackedClass
 * @param {(instanceCount: number) => void} countCallback
 */
export function trackInstanceCount(trackedClass, countCallback) {
  const proto = trackedClass.prototype
  const methods = Object.getOwnPropertyNames(proto).filter(prop => typeof proto[prop] === 'function')

  /** @type {Object.<string, WeakRef>} */
  const instances = {}
  let instanceCount = 0
  function scanInstances() {
    const keys = Object.keys(instances)
    let newCount = keys.length
    for (const key of keys) {
      if (instances[key].deref()) continue;
      delete instances[key]
      newCount--
    }
    if (newCount !== instanceCount) {
      instanceCount = newCount
      countCallback(newCount)
    }
    proto.__INSTCOUNTTIMEOOUT = setTimeout(scanInstances, 200)
  }
  scanInstances()

  methods.forEach((methodName) => {
    const originalName = `${methodName}__NOINSTCOUNT`
    proto[originalName] = proto[methodName]

    proto[methodName] = function(...args) {
      if (!this.__perfId) {
        this.__perfId = Math.floor(Math.random() * 100000)
        instances[this.__perfId] = new WeakRef(this)
        const newCount = Object.keys(instances).length
        instanceCount = newCount
        countCallback(newCount)
      }
      return proto[originalName].apply(this, args)
    }
    Object.defineProperty(proto[methodName], 'name', {value: methodName, writable: false})
  })
}
