// inputs are [0,1] values
// output is a {r, g, b} object with [0-255] values
export function getRandomColor(hue, value, saturation) {
  // HSV to RGB conversion, as seen here: http://axonflux.com/handy-rgb-to-hsl-and-rgb-to-hsv-color-model-c
  var r, g, b, i, f, p, q, t;
  i = Math.floor(hue * 6);
  f = hue * 6 - i;
  p = value * (1 - saturation);
  q = value * (1 - f * saturation);
  t = value * (1 - (1 - f) * saturation);
  switch (i % 6) {
    case 0:
      (r = value), (g = t), (b = p);
      break;
    case 1:
      (r = q), (g = value), (b = p);
      break;
    case 2:
      (r = p), (g = value), (b = t);
      break;
    case 3:
      (r = p), (g = q), (b = value);
      break;
    case 4:
      (r = t), (g = p), (b = value);
      break;
    case 5:
      (r = value), (g = p), (b = q);
      break;
  }

  return {
    r: Math.floor(r * 255),
    g: Math.floor(g * 255),
    b: Math.floor(b * 255)
  };
}

export function formatColorCss(color) {
  return `#${color.r.toString(16)}${color.g.toString(16)}${color.b.toString(
    16
  )}`;
}

export function getCssColorFromString(string) {
  let hashCode = 0;
  for (let i = 0; i < string.length; i++) {
    hashCode += string.charCodeAt(i) + ((hashCode << 5) - hashCode);
  }

  // normalize
  hashCode *= 0.001;
  hashCode -= Math.floor(hashCode);

  return formatColorCss(getRandomColor(hashCode, 0.87, 0.89));
}
