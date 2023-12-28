## Rendering Performance Analyzer

## Usage

To install, run:

```bash
$ npm install --save @camptocamp/rendering-analyzer
```

To use, import API symbols like so:

```js
import { defineFrameContainer, trackPerformance } from '@camptocamp/rendering-analyzer';
```

The package exposes the following functions:

- `defineFrameContainer(classOrInstance, methodName)`

  This defines a class method as the "frame container", meaning that everything done as part of that method (including
  async tasks and events) will be counted in the total frame time.
  This should typically be the `render` method of an app or something like that.
  Required for performance tracking.

- `trackPerformance(classOrInstance, substituteName)`

  Time spent in this class or object will be tracked, as well as method calls and instances count.

- `showGraph()`

  Render the frame graph on the page.

- `showTable()`

  Render the stats table on the page.

- `downloadDataAsCsv()`

  Downloads two CSV files: one for the stats gathered on each tracked classes, and one for the detailed stats of each frame.

- `printDataToConsole()`

  Same as above but both datasets are simply dumped to the browser console.
