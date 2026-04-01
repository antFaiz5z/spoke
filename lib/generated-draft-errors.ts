export function getGeneratedDraftErrorMessage(message: string): string {
  if (message === "Generated dialogue must contain at least two dialogue blocks") {
    return "The model returned only one dialogue block. Please try again.";
  }

  if (message === "Generated dialogue has too many dialogue blocks") {
    return "The model returned an overly long dialogue. Please try again.";
  }

  return message;
}
