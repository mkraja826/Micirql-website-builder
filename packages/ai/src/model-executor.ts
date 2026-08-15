import { assertTaskIsolation, defaultRoutingPolicy, routeModel, type AiTaskKind, type ModelProfile } from "./model-routing";

export type ModelExecutor<TInput = unknown, TOutput = unknown> = {
  profileId: string;
  run(input: TInput): Promise<TOutput>;
};

export type ModelExecutorRegistry = {
  get(profileId: string): ModelExecutor | undefined;
};

export async function executeRoutedTask<TInput, TOutput>(args: {
  task: AiTaskKind;
  input: TInput;
  profiles: readonly ModelProfile[];
  executors: ModelExecutorRegistry;
}): Promise<{ output: TOutput; model: ModelProfile }> {
  const routed = routeModel(args.profiles, defaultRoutingPolicy(args.task));
  if (!routed) throw new Error(`No eligible model is available for ${args.task}.`);

  assertTaskIsolation(args.task, routed.profile);
  const executor = args.executors.get(routed.profile.id);
  if (!executor) throw new Error(`No executor is registered for model ${routed.profile.id}.`);

  const output = await executor.run(args.input) as TOutput;
  return { output, model: routed.profile };
}
