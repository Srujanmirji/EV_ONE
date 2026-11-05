import { authSpikeConfig } from "../auth-spike/config";
export function catalogueEditorConfig(
  env: Record<string, string | undefined> = process.env,
) {
  if (env.CATALOGUE_EDITOR_ENABLED !== "true")
    return { kind: "disabled" as const };
  return authSpikeConfig(env);
}
