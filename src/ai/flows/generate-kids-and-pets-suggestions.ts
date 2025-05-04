// src/ai/flows/generate-kids-and-pets-suggestions.ts
'use server';

/**
 * @fileOverview Generates tailored suggestions for kids and pets based on temperature and humidity.
 *
 * - generateKidsAndPetsSuggestions - A function that generates suggestions specific to kids and pets based on environmental conditions.
 * - KidsAndPetsSuggestionsInput - The input type for the generateKidsAndPetsSuggestions function.
 * - KidsAndPetsSuggestionsOutput - The return type for the generateKidsAndPetsSuggestions function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const KidsAndPetsSuggestionsInputSchema = z.object({
  temperature: z.number().describe('The current temperature in Celsius.'),
  humidity: z.number().describe('The current humidity percentage.'),
  mode: z.enum(['kids', 'pets']).describe('The mode for generating suggestions (kids or pets).'),
});
export type KidsAndPetsSuggestionsInput = z.infer<typeof KidsAndPetsSuggestionsInputSchema>;

const KidsAndPetsSuggestionsOutputSchema = z.object({
  suggestions: z.array(z.string()).describe('An array of suggestions tailored to the specified mode (kids or pets).'),
});
export type KidsAndPetsSuggestionsOutput = z.infer<typeof KidsAndPetsSuggestionsOutputSchema>;

export async function generateKidsAndPetsSuggestions(
  input: KidsAndPetsSuggestionsInput
): Promise<KidsAndPetsSuggestionsOutput> {
  return generateKidsAndPetsSuggestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'kidsAndPetsSuggestionsPrompt',
  input: {
    schema: z.object({
      temperature: z.number().describe('The current temperature in Celsius.'),
      humidity: z.number().describe('The current humidity percentage.'),
      mode: z.enum(['kids', 'pets']).describe('The mode for generating suggestions (kids or pets).'),
    }),
  },
  output: {
    schema: z.object({
      suggestions: z.array(z.string()).describe('An array of suggestions tailored to the specified mode (kids or pets).'),
    }),
  },
  prompt: `You are an AI assistant specializing in providing safety and comfort advice for kids and pets based on environmental conditions.\n\n  Given the current temperature of {{{temperature}}} Celsius and humidity of {{{humidity}}}%, generate a list of suggestions tailored to the '{{mode}}' mode.\n\n  The suggestions should be specific and practical, addressing potential risks and promoting well-being.  The suggestions should consider both temperature and humidity in each response. Be concise. Limit the array to at most 5 suggestions.\n\n  Examples for kids:\n  - "Ensure kids are drinking enough water to stay hydrated in the heat."
  - "Dress kids in light, breathable clothing to prevent overheating."
  - "Avoid prolonged outdoor activities during peak heat hours."
  - "Use a humidifier to maintain comfortable humidity levels and prevent dry skin."
  - "Check the temperature of playground equipment before letting kids play on it to avoid burns."
\n  Examples for pets:\n  - "Provide pets with plenty of fresh, cool water."
  - "Ensure pets have access to shade or a cool indoor space."
  - "Avoid walking pets on hot pavement to protect their paws."
  - "Consider using a cooling mat or vest for pets."
  - "Monitor pets for signs of heatstroke, such as excessive panting or drooling."
  `,
});

const generateKidsAndPetsSuggestionsFlow = ai.defineFlow<
  typeof KidsAndPetsSuggestionsInputSchema,
  typeof KidsAndPetsSuggestionsOutputSchema
>(
  {
    name: 'generateKidsAndPetsSuggestionsFlow',
    inputSchema: KidsAndPetsSuggestionsInputSchema,
    outputSchema: KidsAndPetsSuggestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
