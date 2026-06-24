export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced ?? text;
  const firstObject = candidate.indexOf("{");
  const firstArray = candidate.indexOf("[");
  const start =
    firstObject === -1
      ? firstArray
      : firstArray === -1
        ? firstObject
        : Math.min(firstObject, firstArray);
  if (start === -1) {
    throw new Error("AI response did not contain JSON.");
  }
  const opening = candidate[start];
  const closing = opening === "{" ? "}" : "]";
  const end = candidate.lastIndexOf(closing);
  if (end < start) {
    throw new Error("AI response contained incomplete JSON.");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}
