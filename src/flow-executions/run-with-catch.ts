import type { StepTools } from "./types";

/**
 * Runs a step.run callback in a try/catch so the executor's catch runs first
 * (publish error event, etc.), then rethrows so Inngest onFailure still runs.
 * Use for any step.run whose callback may throw without its own try/catch.
 */
export async function runStepWithCatch<T>(
  step: StepTools,
  stepId: string,
  onError: (error: Error) => Promise<void>,
  fn: () => Promise<T>,
): Promise<T> {
  return step.run(stepId, async () => {
    try {
      return await fn();
    } catch (error) {
      await onError(
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }) as Promise<T>;
}
