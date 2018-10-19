## Rendering Performance Analyzer

## Usage

The package is not published for now. Build the javascript bundle with `npm run build` and include it in your page.

The script will add an object to the global scope named `PERF_ANALYZER`. The following functions are available:

- `PERF_ANALYZER.startFrame()`

  Call at the beginning of the frame rendering process, i.e. in the `requestAnimationFrame` callback.

- `PERF_ANALYZER.endFrame()`

  Call at the end of the frame rendering process.

- `PERF_ANALYZER.beginMeasurement(name, color)`

  Starts measuring a process in the current frame. Color must be CSS-compatible and will be used in the graph.

- `PERF_ANALYZER.endMeasurement()`

  Stops the current process measurement.

- `PERF_ANALYZER.signalEvent(name, color, char)`

  Records an event in the current frame. This will be visible when hovering the graph with the mouse. Color must be CSS-compatible.

## To Do

- print report in console
- export report as JSON
