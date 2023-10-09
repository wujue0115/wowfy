export function isValidTimeFormat(input: string): boolean {
  const regex = /^\d+([0-9]*)?(ms|s)$/;
  return regex.test(input);
}

export function parseDuration(duration: string) {
  const time = parseFloat(duration.split("m")[0].split("s")[0]);
  const millisecond = time * (duration.includes("m") ? 1 : 1000);
  return millisecond;
}

export function setCSS(
  element: HTMLElement,
  styles: { [key: string]: string }
) {
  for (const [property, value] of Object.entries(styles)) {
    element.style[property] = value;
  }
}

export function createElement(
  tag: string = "div",
  styles: { [key: string]: string } = {}
): HTMLElement {
  const element = document.createElement(tag);
  setCSS(element, styles);
  return element;
}

export function parseOptionKeyToAttributeName(optionKey) {
  // Split the optionKey into words using camelCase conversion
  const words = optionKey.split(/(?=[A-Z])/).map((word) => word.toLowerCase());

  // Join the words with dashes and add the "w-" prefix
  return `w-${words.join("-")}`;
}
