/**
 * @param {TotalStats} totalStats
 * @return {Array<Object>} an array of objects that can be exported to CSV
 */
export function formatTotalStatsAsTable(totalStats) {
  const result = []
  for (const className in totalStats.classes) {
    const classStats = totalStats.classes[className]
    for (const methodName in classStats.methods) {
      const methodStats = classStats.methods[methodName]
      result.push({
        className,
        instancesCount: classStats.instanceCount,
        methodName,
        ...methodStats
      })
    }
  }
  return result
}

/**
 * @param {FrameStats[]} framesStats
 * @return {Array<Object>} an array of objects that can be exported to CSV
 */
export function formatFrameStatsAsTable(framesStats) {
  const result = []
  for (let i = 0; i < framesStats.length; i++) {
    const frameStats = framesStats[i]
    for (const className in frameStats.classes) {
      const classStats = frameStats.classes[className]
      result.push({
        frameNumber: i,
        frameSpentTotalMs: frameStats.spentTotalMs,
        className,
        classSpentTotalMs: classStats.spentTotalMs
      })
    }
  }
  return result
}
