import {getCssColorFromString} from './utils'

let classesRoot
let globalStatsRoot
const classesEl = {}

/**
 * @param {HTMLElement} containerElement
 * @param {TotalStats} stats
 * @param {string[]} trackedClasses
 */
export function renderTable(containerElement, stats, trackedClasses) {
  if (!classesRoot) {
    const tableRoot = document.createElement('div')
    tableRoot.style.cssText = `
padding: 8px;
background: rgba(255, 255, 255, 0.8);
font-family: monospace;
font-size: 12px;
width: 400px;
pointer-events: auto;`
    const title = document.createElement('div')
    title.innerText = 'PERFORMANCE STATS';
    title.style.cssText = `
padding: 1px 4px;
font-size: 10px;
border: solid darkred 1px;
border-bottom: none;`
    classesRoot = document.createElement('div')
    classesRoot.style.cssText = `
overflow: auto;
max-height: 50vh;
padding: 8px;
border: solid darkred 1px;`
    globalStatsRoot = document.createElement('div')
    classesRoot.append(globalStatsRoot)
    tableRoot.append(title);
    tableRoot.append(classesRoot);
    containerElement.append(tableRoot);
  }

  globalStatsRoot.innerText = `exceeded frame budget ${stats.exceededFrameBudgetCount} times`

  for (const className of trackedClasses) {
    if (className === '_remaining') continue;
    if (!classesEl[className]) {
      const classRootEl = document.createElement('div')
      classesEl[className] = document.createElement('div')
      classesEl[className].style.cssText = `white-space: pre;`
      classRootEl.append(classesEl[className]);
      classesRoot.append(classRootEl)
    }
    const frameStats = stats.classes[className]
    if (!frameStats) {
      classesEl[className].innerHTML = `
<strong>${className}</strong>
  <small>(no stats)</small>`
      continue;
    }
    const methodStatsText = Object.keys(frameStats.methods)
      .map(methodName => {
        const methodStats = frameStats.methods[methodName]
        return `  <small>.${methodName}
        max. call count per frame = ${methodStats.maxCallCountPerFrame}
        max. spent per frame (ms) = ${methodStats.maxSpentPerFrameMs.toFixed(1)}ms
          avg. time per call (ms) = ${(methodStats.spentTotalMs / methodStats.totalCallCount).toFixed(1)}ms
                  total time (ms) = ${methodStats.spentTotalMs.toFixed(1)}ms</small>`
      })
      .join('\n')
    classesEl[className].innerHTML = `
<strong><span style="color: ${getCssColorFromString(className)}; font-size: 18px">■</span> ${className}</strong>  <small>(${frameStats.instanceCount} instances)</small>
${methodStatsText}`
  }
}
