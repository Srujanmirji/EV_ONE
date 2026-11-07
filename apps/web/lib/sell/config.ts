import { authSpikeConfig } from "../auth-spike/config";
export function sellConfig(
  env: Record<string, string | undefined> = process.env,
) {
  return env.LOCAL_SELL_ENABLED === "true"
    ? authSpikeConfig(env)
    : { kind: "disabled" as const };
}
