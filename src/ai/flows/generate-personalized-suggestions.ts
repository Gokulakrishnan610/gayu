'use server';

/**
 * @fileOverview A flow for generating personalized suggestions based on temperature and humidity.
 *
 * - generatePersonalizedSuggestions - A function that generates personalized suggestions.
 * - PersonalizedSuggestionsInput - The input type for the generatePersonalizedSuggestions function.
 * - PersonalizedSuggestionsOutput - The return type for the generatePersonalizedSuggestions function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

// Removed unused imports:
// import {getCityTemperature} from '@/services/city-temperature'; // No longer used
// import {getCurrentLocation} from '@/services/location'; // No longer used
// import {getSensorData} from '@/services/sensor'; // No longer used

const PersonalizedSuggestionsInputSchema = z.object({
  temperature: z.number().describe('The current temperature in Celsius.'),
  humidity: z.number().describe('The current humidity percentage.'),
});
export type PersonalizedSuggestionsInput = z.infer<
  typeof PersonalizedSuggestionsInputSchema
>;

const PersonalizedSuggestionsOutputSchema = z.object({
  suggestions: z
    .string()
    .describe(
      'A list of personalized suggestions based on the temperature and humidity.'
    ),
});
export type PersonalizedSuggestionsOutput = z.infer<
  typeof PersonalizedSuggestionsOutputSchema
>;

export async function generatePersonalizedSuggestions(
  input: PersonalizedSuggestionsInput
): Promise<PersonalizedSuggestionsOutput> {
    // Check for null values before calling the flow
    if (input.temperature === null || input.humidity === null) {
        console.warn('generatePersonalizedSuggestions: Input contains null values, returning default message.');
        return { suggestions: 'Suggestions unavailable due to sensor reading error.' };
    }
  return generatePersonalizedSuggestionsFlow(input);
}

const generateSuggestionsPrompt = ai.definePrompt({
  name: 'generateSuggestionsPrompt',
  input: {
    // Input schema remains the same, expecting numbers
    schema: z.object({
      temperature: z.number().describe('The current temperature in Celsius.'),
      humidity: z.number().describe('The current humidity percentage.'),
    }),
  },
  output: {
    schema: z.object({
      suggestions: z
        .string()
        .describe(
          'A list of personalized suggestions based on the temperature and humidity.'
        ),
    }),
  },
  prompt: `Based on the following temperature and humidity, generate personalized suggestions for the user. Focus on hydration, humidification, and food suggestions.

Temperature: {{temperature}}°C
Humidity: {{humidity}}%

Suggestions:`,
});

const generatePersonalizedSuggestionsFlow = ai.defineFlow<
  typeof PersonalizedSuggestionsInputSchema,
  typeof PersonalizedSuggestionsOutputSchema
>(
  {
    name: 'generatePersonalizedSuggestionsFlow',
    inputSchema: PersonalizedSuggestionsInputSchema,
    outputSchema: PersonalizedSuggestionsOutputSchema,
  },
  async input => {
    const {output} = await generateSuggestionsPrompt(input);
    return output!;
  }
);
