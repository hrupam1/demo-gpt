import "dotenv/config";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: process.env.NVIDIA_BASE_URL,
});

const getOpenAIAPIResponse = async (message) => {
  try {
    const completion = await openai.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [{ "role": "user", "content": message }],
      temperature: 1,
      top_p: 1,
      max_tokens: 4096,
      stream: false
    });

    const reasoning = completion.choices[0]?.message?.reasoning_content;
    if (reasoning) {
      process.stdout.write("--- REASONING ---\n" + reasoning + "\n-----------------\n");
    }

    const content = completion.choices[0]?.message?.content || "";

    return content;
  } catch (err) {
    console.error("Error calling OpenAI/Nvidia API:", err);
    throw err;
  }
};

export default getOpenAIAPIResponse;