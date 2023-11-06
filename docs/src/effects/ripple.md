---
outline: deep
---

# Ripple

:::warning
When using this effect, be careful not to apply it to HTML tag elements that are too large in size, and avoid triggering too many ripple animations simultaneously, as this can place a burden on the browser and potentially cause rendering bugs.
:::

## Effect

:::code-group
```html [HTML tag attribute]
<div
  w-ripple // [!code hl]
>
  
</div>
```

```js [Class argument]
const wowfyRipple = new Wowfy(
  /* element */,
  "ripple", // [!code hl]
  /* option */
);
```
:::

## Option

### background

| Type     | Default       |
| -------- | ------------- |
| `string` | `"#ff98cfaa"` |

The background style of the ripple can be set with CSS [color values](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value), and it also supports [radial-gradient()](https://developer.mozilla.org/en-US/docs/Web/CSS/gradient/radial-gradient).

### outline
| Type     | Default |
| -------- | ------- |
| `string` | `""`    |

The outline can be set with the same values as the CSS [outline](https://developer.mozilla.org/en-US/docs/Web/CSS/outline).

### boxShadow
| Type     | Default |
| -------- | ------- |
| `string` | `""`    |

The boxShadow can be set with the same values as the CSS [box-shadow](https://developer.mozilla.org/zh-TW/docs/Web/CSS/box-shadow).

### event

| Type     | Default       |
| -------- | ------------- |
| `string` | `"mousedown"` |

The events that trigger the ripple animation, it is recommended to use "mousedown", "mouseenter", or "mousemove", but you can also try others such as "dblclick".

### mode

| Type     | Default |
| -------- | ------- |
| [`TRippleMode`](ripple.md#types-tripplemode) | `"unkeep"` |

The mode has two values: "keep" and "unkeep". **When set to "keep", the animation will only be maintained as long as the event remains in the event state** (for example, when the event is set to "mousedown", and the mode is set to "keep", the animation will continue only while the mouse button is held down). Conversely, with "unkeep", the animation runs until it stops as soon as the event is triggered.

:::warning
When the mode is set to "unkeep", the event must be either "mousedown" or "mouseenter". The former removes the animation when "mouseup" is triggered, while the latter does so when "mouseleave" is triggered.
:::

### position

| Type     | Default |
| -------- | ------- |
| [`TRipplePosition`](ripple.md#types-trippleposition) | `"cs"` |

The starting position of the ripple when triggered, and it supports shorthand notation (for example, "cursor" can be written as "cs", or "top-right" can be written as "tr" or "rt"). Detailed values can be found in [`TRipplePosition`](ripple.md#types-trippleposition).

### sizeRatio

| Type     | Default | Range  |
| -------- | ------- | ------ |
| `number` | `1`     | `0.0 < value ≤ 1.0` |

The size ratio of the ripple.

### duration

| Type     | Default   | Range  |
| -------- | --------- | ------ |
| `string` | `"500ms"` | `> 0s` |

The duration of the ripple animation can be set with CSS [time values](https://developer.mozilla.org/en-US/docs/Web/CSS/time).
It is recommended to use values in the range of 0.2s to 5s.

### delay

| Type     | Default |
| -------- | ------- |
| `string` | `"0ms"` |

The delay time for each triggered ripple animation can be set to the same values as CSS [time values](https://developer.mozilla.org/en-US/docs/Web/CSS/time).

### timingFucntion

| Type     | Default     |
| -------- | ----------- |
| `string` | `"ease-in"` |

The timingFunction can be set with the same values as the CSS [transition-timing-function](https://developer.mozilla.org/en-US/docs/Web/CSS/transition-timing-function).

### repeatCount
| Type     | Default | Range  |
| -------- | ------- | ------ |
| `number` | `1`     | `1 ≤ value ≤ 5` |

The number of times the ripple animation will be triggered when the event is triggered.

### repeatInterval
| Type     | Default |
| -------- | ------- |
| `string` | `"0ms"` |

When rippleCount is greater than 1, the interval between ripple animations.

### maxCount
| Type     | Default | Range  |
| -------- | ------- | ------ |
| `number` | `10`    | `1 ≤ value ≤ 20` |

The maximum number of ripple animations that can be active at the same time on a single HTML tag element.

## Types

### TRippleMode {#types-tripplemode}
```ts:line-numbers
type TRippleMode = "keep" | "unkeep";
```

### TRipplePosition {#types-trippleposition}
```ts:line-numbers
type TRipplePosition =
  | "cursor"
  | "center"
  | "random"
  | "top"
  | "bottom"
  | "right"
  | "left"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "left-top"     // same as the "top-left"
  | "left-bottom"  // same as the "bottom-left"
  | "right-top"    // same as the "top-right"
  | "right-bottom" // same as the "bottom-right"
  | "cs"           // same as the "cursor"
  | "ct"           // same as the "center"
  | "rd"           // same as the "random"
  | "t"            // same as the "top"
  | "b"            // same as the "bottom"
  | "l"            // same as the "right"
  | "r"            // same as the "left"
  | "tl"           // same as the "top-left"
  | "tr"           // same as the "top-right"
  | "bl"           // same as the "bottom-left"
  | "br"           // same as the "bottom-right"
  | "lt"           // same as the "top-left"
  | "lb"           // same as the "bottom-left"
  | "rt"           // same as the "top-right"
  | "rb";          // same as the "bottom-right"
```