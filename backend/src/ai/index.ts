export async function generateAIReply(userPrompt: string): Promise<string> {
  // Simulate AI generation latency
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // TODO: Connect real AI model here (e.g. OpenAI / Anthropic / Gemini)
  return "I received your study check-in! Let's think through this concept step by step.";
}
