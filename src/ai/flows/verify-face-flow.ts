'use server';
/**
 * @fileOverview A facial verification flow for gym member authentication.
 *
 * - verifyFace - A function that compares two photos to verify identity.
 * - VerifyFaceInput - The input type for the verifyFace function.
 * - VerifyFaceOutput - The return type for the verifyFace function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const VerifyFaceInputSchema = z.object({
  storedPhotoDataUri: z
    .string()
    .describe(
      "The stored profile photo of the member as a data URI."
    ),
  livePhotoDataUri: z
    .string()
    .describe(
      "The live capture photo as a data URI."
    ),
});
export type VerifyFaceInput = z.infer<typeof VerifyFaceInputSchema>;

const VerifyFaceOutputSchema = z.object({
  isMatch: z.boolean().describe('Whether the two photos belong to the same person.'),
  confidence: z.number().describe('Confidence score between 0 and 1.'),
  reason: z.string().describe('Brief explanation for the decision.'),
});
export type VerifyFaceOutput = z.infer<typeof VerifyFaceOutputSchema>;

export async function verifyFace(input: VerifyFaceInput): Promise<VerifyFaceOutput> {
  return verifyFaceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'verifyFacePrompt',
  input: { schema: VerifyFaceInputSchema },
  output: { schema: VerifyFaceOutputSchema },
  prompt: `You are an expert in facial recognition and identity verification.

Compare the following two images:
1. Stored Profile Photo: {{media url=storedPhotoDataUri}}
2. Live Capture: {{media url=livePhotoDataUri}}

Determine if they represent the same individual. High accuracy is required for gym security. 
Consider lighting, angles, and facial features. 

Provide your analysis in the specified JSON format.`,
});

const verifyFaceFlow = ai.defineFlow(
  {
    name: 'verifyFaceFlow',
    inputSchema: VerifyFaceInputSchema,
    outputSchema: VerifyFaceOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) throw new Error('AI failed to verify face.');
    return output;
  }
);
