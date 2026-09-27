import { GoogleGenAI } from '@google/genai';

let cachedAiClient: GoogleGenAI | null = null;

export function acquireGeminiEngine(): GoogleGenAI {
  if (cachedAiClient) {
    return cachedAiClient;
  }

  const secretToken = process.env.GEMINI_API_KEY;
  if (!secretToken) {
    throw new Error('GEMINI_API_KEY environment variable is not configured.');
  }

  cachedAiClient = new GoogleGenAI({
    apiKey: secretToken,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  return cachedAiClient;
}

// In-memory tracking of models temporarily experiencing quota exhaustion
const exhaustedModelCooldowns = new Map<string, number>();

export function markModelExhausted(model: string, cooldownDurationMs = 15 * 60 * 1000): void {
  exhaustedModelCooldowns.set(model, Date.now() + cooldownDurationMs);
}

export function isModelExhausted(model: string): boolean {
  const expiry = exhaustedModelCooldowns.get(model);
  if (!expiry) return false;
  if (Date.now() > expiry) {
    exhaustedModelCooldowns.delete(model);
    return false;
  }
  return true;
}

// Initialize known exhausted models
markModelExhausted('gemini-3.8-flash', 30 * 60 * 1000);
markModelExhausted('gemini-3.7-flash', 30 * 60 * 1000);
markModelExhausted('gemini-flash-latest', 30 * 60 * 1000);

export function evaluateTransientFault(fault: any): boolean {
  const faultMessage = String(fault?.message || '').toLowerCase();
  const innerCauseMessage = String(fault?.cause?.message || fault?.cause?.code || '').toLowerCase();
  const errorIdentifier = String(fault?.name || '').toLowerCase();
  const numericCode = fault?.status || fault?.code || fault?.statusCode;

  const retryableHttpStatusCodes = [404, 429, 500, 502, 503, 504];
  if (typeof numericCode === 'number' && retryableHttpStatusCodes.includes(numericCode)) {
    return true;
  }

  const faultSignatures = [
    '404',
    'not found',
    'models/',
    '503',
    '429',
    '500',
    '502',
    '504',
    'fetch failed',
    'network',
    'econnreset',
    'etimedout',
    'enotfound',
    'socket',
    'high demand',
    'unavailable',
    'resource_exhausted',
    'quota',
    'overloaded',
    'aborterror',
  ];

  for (const sig of faultSignatures) {
    if (
      faultMessage.includes(sig) ||
      innerCauseMessage.includes(sig) ||
      errorIdentifier.includes(sig)
    ) {
      return true;
    }
  }

  return false;
}

export function isQuotaExhaustionFault(fault: any): boolean {
  const faultMessage = String(fault?.message || '').toLowerCase();
  const innerCauseMessage = String(fault?.cause?.message || fault?.cause?.code || '').toLowerCase();
  const statusStr = String(fault?.status || '').toLowerCase();

  return (
    faultMessage.includes('quota') ||
    faultMessage.includes('resource_exhausted') ||
    faultMessage.includes('429') ||
    innerCauseMessage.includes('quota') ||
    statusStr.includes('resource_exhausted') ||
    fault?.status === 429 ||
    fault?.code === 429
  );
}

export function sanitizeUserFacingErrorMessage(err: any): string {
  const raw = String(err?.message || '');

  if (raw.includes('404') || raw.includes('not found') || raw.includes('NOT_FOUND')) {
    return 'The AI engine endpoint was momentarily unavailable. The service has automatically refreshed its pipeline.';
  }
  if (raw.includes('503') || raw.includes('high demand') || raw.includes('UNAVAILABLE')) {
    return 'The AI cluster is momentarily experiencing high server volume. Please retry in a moment.';
  }
  if (raw.includes('429') || raw.includes('RESOURCE_EXHAUSTED') || raw.includes('quota')) {
    return 'AI request limit reached. The system is transitioning to fallback capacity.';
  }
  if (raw.includes('GEMINI_API_KEY')) {
    return 'Gemini API credential is not configured in server environment settings.';
  }
  if (raw.includes('fetch failed') || raw.includes('network') || raw.includes('ECONNRESET')) {
    return 'A transient network disruption occurred while communicating with the AI cluster. Please retry.';
  }

  return raw || 'An unexpected error occurred while processing educational materials.';
}

export interface ModelInvocationSpec {
  contents: any;
  config?: any;
}

export interface InvocationResult<T = any> {
  response: any;
  resolvedModel: string;
  parsedJson?: T;
}

export async function executeResilientModelCall<T = any>(
  engine: GoogleGenAI,
  specProducer: (modelCode: string, useStrictSchema?: boolean) => ModelInvocationSpec,
  primaryCandidate = 'gemini-3.1-flash-lite',
  alternateCandidates = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.7-flash']
): Promise<InvocationResult<T>> {
  const rawPipeline = Array.from(new Set([primaryCandidate, ...alternateCandidates]));

  // Prioritize models that are not in quota cooldown
  const modelPipeline = [...rawPipeline].sort((a, b) => {
    const aExhausted = isModelExhausted(a) ? 1 : 0;
    const bExhausted = isModelExhausted(b) ? 1 : 0;
    return aExhausted - bExhausted;
  });

  let accumulatedFault: any = null;

  for (const targetModel of modelPipeline) {
    for (const useStrict of [true, false]) {
      try {
        const invocationSpec = specProducer(targetModel, useStrict);
        const configToUse = { ...(invocationSpec.config || {}) };
        if (!useStrict && configToUse.responseSchema) {
          delete configToUse.responseSchema;
        }

        const modelOutput = await engine.models.generateContent({
          model: targetModel,
          contents: invocationSpec.contents,
          config: configToUse,
        });

        let jsonPayload: T | undefined = undefined;
        if (modelOutput.text) {
          try {
            const cleanText = modelOutput.text
              .replace(/^```json\s*/i, '')
              .replace(/^```\s*/i, '')
              .replace(/```\s*$/i, '')
              .trim();
            jsonPayload = JSON.parse(cleanText);
          } catch {
            const jsonMatch =
              modelOutput.text.match(/```json\s*([\s\S]*?)\s*```/) ||
              modelOutput.text.match(/([\{\[][\s\S]*[\}\]])/);
            if (jsonMatch) {
              try {
                jsonPayload = JSON.parse(jsonMatch[1]);
              } catch {
                // Lenient fallback
              }
            }
          }
        }

        if (jsonPayload !== undefined) {
          return {
            response: modelOutput,
            resolvedModel: targetModel,
            parsedJson: jsonPayload,
          };
        }

        if (modelOutput.text) {
          return {
            response: modelOutput,
            resolvedModel: targetModel,
            parsedJson: jsonPayload,
          };
        }
      } catch (invocationError: any) {
        accumulatedFault = invocationError;

        if (isQuotaExhaustionFault(invocationError)) {
          // Model ran out of daily quota: mark it so subsequent calls don't hit it
          markModelExhausted(targetModel);
          // Don't bother retrying without schema on a quota-exhausted model; move to next model immediately
          break;
        }

        const canRetry = evaluateTransientFault(invocationError);
        if (!canRetry) {
          throw invocationError;
        }

        // Brief delay before trying next pass
        await new Promise((res) => setTimeout(res, 300));
      }
    }
  }

  throw accumulatedFault || new Error('All candidate model pipelines exhausted without completion.');
}

/**
 * Interactions API integration for conversational and interactive tutoring
 */
export async function executeInteractionCall(
  engine: GoogleGenAI,
  params: {
    input: any;
    systemInstruction?: string;
    temperature?: number;
    primaryModel?: string;
    fallbackModels?: string[];
  }
): Promise<string> {
  const rawModels = [
    params.primaryModel || 'gemini-3.1-flash-lite',
    ...(params.fallbackModels || ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.7-flash']),
  ];

  const targetModels = Array.from(new Set(rawModels)).sort((a, b) => {
    const aExhausted = isModelExhausted(a) ? 1 : 0;
    const bExhausted = isModelExhausted(b) ? 1 : 0;
    return aExhausted - bExhausted;
  });

  let lastError: any = null;

  for (const model of targetModels) {
    // Attempt using ai.interactions.create if available on the SDK
    if (typeof (engine as any).interactions?.create === 'function') {
      try {
        const interaction = await (engine as any).interactions.create({
          model,
          input: typeof params.input === 'string' ? params.input : JSON.stringify(params.input),
          system_instruction: params.systemInstruction,
          generation_config: {
            temperature: params.temperature ?? 0.5,
          },
        });

        if (interaction.output_text) {
          return interaction.output_text;
        }

        if (Array.isArray(interaction.steps)) {
          let extracted = '';
          for (const step of interaction.steps) {
            if (step.type === 'model_output' && Array.isArray(step.content)) {
              for (const part of step.content) {
                if (part.type === 'text' && part.text) {
                  extracted += part.text;
                }
              }
            }
          }
          if (extracted.trim()) {
            return extracted.trim();
          }
        }
      } catch (interactionErr: any) {
        lastError = interactionErr;
        if (isQuotaExhaustionFault(interactionErr)) {
          markModelExhausted(model);
        }
      }
    }

    // Standard generateContent fallback
    try {
      const response = await engine.models.generateContent({
        model,
        contents: params.input,
        config: params.systemInstruction
          ? {
              systemInstruction: params.systemInstruction,
              temperature: params.temperature ?? 0.5,
            }
          : { temperature: params.temperature ?? 0.5 },
      });

      if (response.text) {
        return response.text;
      }
    } catch (genErr: any) {
      lastError = genErr;
      if (isQuotaExhaustionFault(genErr)) {
        markModelExhausted(model);
      }
    }
  }

  throw lastError || new Error('Failed to generate response across interaction pipelines.');
}
