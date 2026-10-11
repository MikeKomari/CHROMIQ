import type { Tokens } from "@/types/workspace";

export function validateTokens(tokens: Tokens): string[] {
  const errors: string[] = [];
  if (tokens.radius < 0) errors.push("Radius cannot be negative.");
  if (tokens.spacing < 1) errors.push("Spacing must be at least 1px.");
  if (tokens.borderWidth < 0) errors.push("Border width cannot be negative.");
  if (tokens.shadow < 0 || tokens.shadow > 4)
    errors.push("Elevation must be between 0 and 4.");
  if (tokens.motion < 0) errors.push("Motion duration cannot be negative.");
  if (tokens.typeScale <= 0) errors.push("Type scale must be positive.");
  if (tokens.lineHeight <= 0) errors.push("Line height must be positive.");
  if (
    tokens.breakpointSm <= 0 ||
    tokens.breakpointMd <= 0 ||
    tokens.breakpointLg <= 0
  )
    errors.push("Breakpoints must be positive.");
  if (!(tokens.breakpointSm < tokens.breakpointMd && tokens.breakpointMd < tokens.breakpointLg))
    errors.push("Breakpoints must increase: sm < md < lg.");
  return errors;
}
