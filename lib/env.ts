type RequiredEnvKey = "DATABASE_URL";

function readEnv(key: string): string | undefined {
  const value = process.env[key];
  return value && value.trim() ? value : undefined;
}

export function getEnv(key: RequiredEnvKey): string {
  const value = readEnv(key);
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const appEnv = {
  databaseUrl: readEnv("DATABASE_URL"),
  openAiApiBaseUrl: readEnv("OPENAI_API_BASE_URL"),
  openAiApiKey: readEnv("OPENAI_API_KEY"),
  ttsApiBaseUrl: readEnv("TTS_API_BASE_URL"),
  ttsApiKey: readEnv("TTS_API_KEY"),
};
