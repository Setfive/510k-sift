import path from "path";

(async () => {
  const llmImport = await import("llama-node");
  const LLM = llmImport.LLM;
  const importLlama = await import("llama-node/dist/llm/llama-cpp.js");
  const LLamaCpp = importLlama.LLamaCpp;

  const model = path.resolve(
    process.cwd(),
    "../../models/gpt4-x-alpaca-30b-ggml-q4_1.bin"
  );

  const llama = new LLM(LLamaCpp);

  const config: any = {
    modelPath: model,
    enableLogging: true,
    nCtx: 1024,
    seed: 0,
    f16Kv: false,
    logitsAll: false,
    vocabOnly: false,
    useMlock: false,
    embedding: false,
    useMmap: true,
    nGpuLayers: 0,
  };

  const template = `How are you?`;

  const prompt = `A chat between a user and an assistant.
USER: ${template}
ASSISTANT:`;

  const params: any = {
    nThreads: 4,
    nTokPredict: 2048,
    topK: 40,
    topP: 0.1,
    temp: 0.2,
    repeatPenalty: 1,
    prompt,
  };

  const run = async () => {
    await llama.load(config);

    await llama.createCompletion(params, (response) => {
      process.stdout.write(response.token);
    });
  };

  run();
})();
