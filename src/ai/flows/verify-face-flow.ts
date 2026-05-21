'use server';
/**
 * @fileOverview A facial identification flow for gym member authentication.
 *
 * - identifyMember - A function that identifies a person from a gallery of photos.
 * - IdentifyMemberInput - The input type for the identifyMember function.
 * - IdentifyMemberOutput - The return type for the identifyMember function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const IdentifyMemberInputSchema = z.object({
  livePhotoDataUri: z
    .string()
    .describe("The live capture photo as a data URI."),
  candidates: z.array(z.object({
    id: z.string(),
    name: z.string(),
    photoDataUri: z.string()
  })).describe("List of potential members to match against.")
});
export type IdentifyMemberInput = z.infer<typeof IdentifyMemberInputSchema>;

const IdentifyMemberOutputSchema = z.object({
  matchedMemberId: z.string().nullable().describe('The ID of the matched member, or null if no match.'),
  confidence: z.number().describe('Confidence score between 0 and 1.'),
  reason: z.string().describe('Brief explanation for the decision.'),
});
export type IdentifyMemberOutput = z.infer<typeof IdentifyMemberOutputSchema>;

export async function identifyMember(input: IdentifyMemberInput): Promise<IdentifyMemberOutput> {
  return identifyMemberFlow(input);
}

const prompt = ai.definePrompt({
  name: 'identifyMemberPrompt',
  input: { schema: IdentifyMemberInputSchema },
  output: { schema: IdentifyMemberOutputSchema },
  prompt: `You are a security expert in facial recognition.

Live Capture: {{media url=livePhotoDataUri}}

Gallery of Registered Members:
{{#each candidates}}
- ID: {{id}}, Name: {{name}}, Photo: {{media url=photoDataUri}}
{{/each}}

Task:
Compare the Live Capture against the Gallery. Determine if the person in the Live Capture is one of the members in the gallery. 

If there is a match with high confidence (above 85%), return the matchedMemberId. If no one matches clearly, return matchedMemberId as null.

Provide your analysis in the specified JSON format.`,
});

const identifyMemberFlow = ai.defineFlow(
  {
    name: 'identifyMemberFlow',
    inputSchema: IdentifyMemberInputSchema,
    outputSchema: IdentifyMemberOutputSchema,
  },
  async (input) => {
    // If no candidates, don't waste an AI call
    if (input.candidates.length === 0) {
      return { matchedMemberId: null, confidence: 0, reason: "No members to compare against." };
    }
    const { output } = await prompt(input);
    if (!output) throw new Error('AI failed to identify member.');
    return output;
  }
);
