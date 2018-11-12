## Rendering Performance Analyzer

## Usage

The package is not published for now. Build the javascript bundle with `npm run build` and include it in your page.

The package exposes one default export called `PerfAnalyzer`. The following functions are available:

- `PerfAnalyzer.startFrame()`

  Call at the beginning of the frame rendering process, i.e. in the `requestAnimationFrame` callback.

- `PerfAnalyzer.endFrame()`

  Call at the end of the frame rendering process.

- `PerfAnalyzer.beginMeasurement(name, color)`

  Starts measuring a process in the current frame. Color must be CSS-compatible and will be used in the graph.

- `PerfAnalyzer.endMeasurement()`

  Stops the current process measurement.

- `PerfAnalyzer.signalEvent(name, color, char)`

  Records an event in the current frame. This will be visible when hovering the graph with the mouse. Color must be CSS-compatible.

- `PerfAnalyzer.getFramesData()`

  Returns a JSON object containing all data recorded up until now. The structure is as follows:

  ```json
  {
    "frames": [
      {
        "total": 235.25,
        "measures": { "measureName": 42.41, "_remaining": 192.84 },
        "events": { "eventName": 14 }
      },
      ...
    ]
  }
  ```

## To Do

- print report in console
