let classesRoot
const classesEl = {}

/**
 * @param {HTMLElement} containerElement
 * @param {FrameStats[]} frames
 * @param {string[]} trackedClasses
 */
export function renderTable(containerElement, frames, trackedClasses) {
  if (!classesRoot) {
    const tableRoot = document.createElement('div')
    tableRoot.style.cssText = `
padding: 8px;
background: rgba(255, 255, 255, 0.8);
font-family: monospace;
font-size: 12px;
width: 500px;`
    const title = document.createElement('div')
    title.innerText = 'PERFORMANCE STATS';
    title.style.cssText = `
padding: 1px 4px;
font-size: 10px;
border: solid darkred 1px;
border-bottom: none;`
    classesRoot = document.createElement('div')
    classesRoot.style.cssText = `
padding: 8px;
border: solid darkred 1px;`
    tableRoot.append(title);
    tableRoot.append(classesRoot);
    containerElement.append(tableRoot);
  }

  const lastFrame = frames[frames.length - 1]

  for (const className of trackedClasses) {
    if (!classesEl[className]) {
      const classRootEl = document.createElement('div')
      classesEl[className] = document.createElement('div')
      classesEl[className].style.cssText = `
font-size: 11px;
white-space: pre;`
      const label = document.createElement('div')
      label.style.cssText = `font-weight: bold;`;
      label.innerText = className;
      classRootEl.append(label, classesEl[className]);
      classesRoot.append(classRootEl)
    }
    const frameStats = lastFrame.classes[className]
    classesEl[className].innerText = frameStats ? Object.keys(frameStats.methods)
      .map(methodName => {
        const spentMs = frameStats.methods[methodName].spentTotalMs.toFixed(1);
        const callCount = frameStats.methods[methodName].callCount;
        return `  .${methodName}
    calls = ${callCount}   spent(ms) = ${spentMs}ms`
      })
      .join('\n') : '  (no method calls)'
  }
}
