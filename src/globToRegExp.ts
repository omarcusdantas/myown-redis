export function globToRegExp(pattern: string): RegExp {
  let regex = "^";
  let i = 0;

  while (i < pattern.length) {
    const char = pattern[i];

    switch (char) {
      case "*":
        regex += ".*";
        break;

      case "?":
        regex += ".";
        break;

      case "[": {
        let j = i + 1;
        while (j < pattern.length && pattern[j] !== "]") j++;

        if (j >= pattern.length) {
          regex += "\\[";
        } else {
          regex += pattern.slice(i, j + 1);
          i = j;
        }
        break;
      }

      case "\\":
        i++;
        if (i < pattern.length) regex += `\\${pattern[i]}`;
        break;

      default:
        regex += char?.replace(/[.+^${}()|]/g, "\\$&") ?? "";
    }

    i++;
  }

  regex += "$";
  return new RegExp(regex);
}
