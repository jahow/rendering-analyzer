import {clearTracking, trackExecutionStats} from './tracking'
import {setTimeout as setTimeoutPromise} from 'timers/promises'

let currentTime
globalThis.performance = {
  now() {
    return currentTime;
  }
}

beforeEach(() => {
  currentTime = 0;
})

class TestApp {
  render() {

  }
}

class FirstModule {
  simpleSyncTask() {
    currentTime += 10;
  }
  simpleAsyncTask() {
    setTimeout(() => {
      currentTime += 11
    }, 1)
  }
  simplePromiseTask() {
    return Promise.resolve(true).then(() => {
      currentTime += 12
    })
  }
  simpleEventTask() {
    const target = new EventTarget()
    target.addEventListener('testEvent', () => {
      currentTime += 13
    })
    setTimeout(() => {
      target.dispatchEvent(new Event('testEvent'))
    }, 2)
  }
}

class SecondModule {
  submodule = new FirstModule()

  complexSyncTask() {
    this.submodule.simpleSyncTask()
    currentTime += 20
  }

  complexAsyncTask() {
    this.submodule.simpleEventTask()
    currentTime += 21
    this.submodule.simplePromiseTask().then(() => {
      currentTime += 22
    })
    this.submodule.simpleAsyncTask()
  }
}

class ThirdModule {
  submodule1 = new FirstModule()
  submodule2 = new SecondModule()

  complexTask() {
    this.submodule1.simpleSyncTask()
    this.submodule2.complexAsyncTask()
    currentTime += 30
    this.submodule1.simplePromiseTask().then(() => {
      this.submodule1.simpleEventTask()
      this.submodule2.complexSyncTask()
      setTimeout(() => {
        currentTime += 31
        this.submodule1.simpleSyncTask()
      })
    })
  }
}

describe("trackExecutionStats", () => {
  let trackedTime1, trackedTime2, trackedTime3
  let trackedTotalTime1, trackedTotalTime2, trackedTotalTime3
  let methodCalls1, methodCalls2, methodCalls3
  const trackTime1 = (selfMs, totalMs, methodName, invoked) => {
    trackedTime1 += selfMs
    trackedTotalTime1 += totalMs
    if (invoked) {
      methodCalls1[methodName] = methodCalls1[methodName] || 0
      methodCalls1[methodName]++
    }
  }
  const trackTime2 = (selfMs, totalMs, methodName, invoked) => {
    trackedTime2 += selfMs
    trackedTotalTime2 += totalMs
    if (invoked) {
      methodCalls2[methodName] = methodCalls2[methodName] || 0
      methodCalls2[methodName]++
    }
  }
  const trackTime3 = (selfMs, totalMs, methodName, invoked) => {
    trackedTime3 += selfMs
    trackedTotalTime3 += totalMs
    if (invoked) {
      methodCalls3[methodName] = methodCalls3[methodName] || 0
      methodCalls3[methodName]++
    }
  }
  beforeEach(() => {
    trackedTime1 = 0
    trackedTime2 = 0
    trackedTime3 = 0
    trackedTotalTime1 = 0
    trackedTotalTime2 = 0
    trackedTotalTime3 = 0
    methodCalls1 = {}
    methodCalls2 = {}
    methodCalls3 = {}
    trackExecutionStats(FirstModule, trackTime1)
    trackExecutionStats(SecondModule, trackTime2)
    trackExecutionStats(ThirdModule, trackTime3)
  })
  afterEach(() => {
    clearTracking(FirstModule)
    clearTracking(SecondModule)
    clearTracking(ThirdModule)
  })
  describe('one class tracked', () => {
    beforeEach(async () => {
      const inst = new FirstModule()
      inst.simpleSyncTask()
      inst.simpleAsyncTask()
      inst.simplePromiseTask()
      await setTimeoutPromise(10)
    })
    it("tracks execution time on sync and async tasks", () => {
      expect(trackedTime1).toEqual(10 + 11 + 12)
      expect(trackedTotalTime1).toEqual(10 + 11 + 12)
    })
    it("tracks method calls", () => {
      expect(methodCalls1).toEqual({
        simpleSyncTask: 1,
        simpleAsyncTask: 1,
        simplePromiseTask: 1,
      })
    })
  })
  describe('one class tracked with event task', () => {
    beforeEach(async () => {
      const inst = new FirstModule()
      inst.simpleSyncTask()
      inst.simpleEventTask()
      await setTimeoutPromise(10)
    })
    it("tracks execution time on sync and event tasks", () => {
      expect(trackedTime1).toEqual(10 + 13)
      expect(trackedTotalTime1).toEqual(10 + 13)
    })
    it("tracks method calls", () => {
      expect(methodCalls1).toEqual({
        simpleSyncTask: 1,
        simpleEventTask: 1,
      })
    })
  })
  describe('two classes side-by-side tracked', () => {
    beforeEach(async () => {
      const instA = new FirstModule()
      const instB = new FirstModule()
      instA.simpleSyncTask()
      instA.simpleSyncTask()
      instA.simpleAsyncTask()
      instB.simplePromiseTask()
      instB.simpleAsyncTask()
      instB.simpleEventTask()
      await setTimeoutPromise(10)
    })
    it("tracks execution time on sync and async tasks", () => {
      expect(trackedTime1).toEqual(10 + 10 + 11 + 11 + 12 + 13)
      expect(trackedTotalTime1).toEqual(10 + 10 + 11 + 11 + 12 + 13)
    })
    it("tracks method calls", () => {
      expect(methodCalls1).toEqual({
        simpleSyncTask: 2,
        simpleAsyncTask: 2,
        simplePromiseTask: 1,
        simpleEventTask: 1,
      })
    })
  })
  describe('two nested classes tracked, sync tasks', () => {
    beforeEach(() => {
      const inst = new SecondModule()
      inst.complexSyncTask()
    })
    it("tracks execution time on first module", () => {
      expect(trackedTime1).toEqual(10)
      expect(trackedTotalTime1).toEqual(10)
    })
    it("tracks self execution time on second module", () => {
      expect(trackedTime2).toEqual(20)
    })
    it("tracks total execution time on second module", () => {
      expect(trackedTotalTime2).toEqual(10 + 20)
    })
    it("tracks method calls for first module", () => {
      expect(methodCalls1).toEqual({
        simpleSyncTask: 1,
      })
    })
    it("tracks method calls for second module", () => {
      expect(methodCalls2).toEqual({
        complexSyncTask: 1,
      })
    })
  })
  describe('two nested classes tracked, async tasks', () => {
    beforeEach(async () => {
      const inst = new SecondModule()
      inst.complexAsyncTask()
      await setTimeoutPromise(10)
    })
    it("tracks execution time on first module", () => {
      expect(trackedTime1).toEqual(11 + 12 + 13)
      expect(trackedTotalTime1).toEqual(11 + 12 + 13)
    })
    it("tracks self execution time on second module", () => {
      expect(trackedTime2).toEqual(21 + 22)
    })
    it("tracks total execution time on second module", () => {
      expect(trackedTotalTime2).toEqual(11 + 12 + 13 + 21 + 22)
    })
    it("tracks method calls for first module", () => {
      expect(methodCalls1).toEqual({
        simpleAsyncTask: 1,
        simplePromiseTask: 1,
        simpleEventTask: 1,
      })
    })
    it("tracks method calls for second module", () => {
      expect(methodCalls2).toEqual({
        complexAsyncTask: 1,
      })
    })
  })
  describe('three nested classes tracked', () => {
    beforeEach(async () => {
      const inst = new ThirdModule()
      inst.complexTask()
      await setTimeoutPromise(50)
    })
    it("tracks execution time on first module", () => {
      expect(trackedTime1).toEqual(10 + 10 + 12 + 13 + 11 + 12 + 13 + 10)
    })
    it("tracks self execution time on second module", () => {
      expect(trackedTime2).toEqual(20 + 21 + 22)
    })
    it("tracks total execution time on second module", () => {
      expect(trackedTotalTime2).toEqual(10 + 11 + 12 + 13 + 20 + 21 + 22)
    })
    it("tracks self execution time on third module", () => {
      expect(trackedTime3).toEqual(30 + 31)
    })
    it("tracks total execution time on third module", () => {
      expect(trackedTotalTime3).toEqual(10 + 10 + 12 + 13 + 11 + 12 + 13 + 10 + 20 + 21 + 22 + 30 + 31)
    })
    it("tracks method calls for first module", () => {
      expect(methodCalls1).toEqual({
        simpleSyncTask: 3,
        simpleAsyncTask: 1,
        simplePromiseTask: 2,
        simpleEventTask: 2,
      })
    })
    it("tracks method calls for second module", () => {
      expect(methodCalls2).toEqual({
        complexSyncTask: 1,
        complexAsyncTask: 1,
      })
    })
    it("tracks method calls for third module", () => {
      expect(methodCalls3).toEqual({
        complexTask: 1,
      })
    })
  })
})
