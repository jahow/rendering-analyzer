## Rendering Performance Analyzer

## Usage

The package is not published for now. Build the javascript bundle with `npm run build` and include it in your page.

The package exposes the following functions:

- `defineFrameContainer(classOrInstance, methodName)`

  This defines a class method as the "frame container", meaning that everything done as part of that method (including)
  async tasks and events) will be counted in the total frame time.
  This should typically be the `render` method of an app or something like that
  Required for performance tracking.

- `trackPerformance(classOrInstance, substituteName)`

  Time spent in this class or object will be tracked, as well as method calls and instances count.
