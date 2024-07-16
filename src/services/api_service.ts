/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { ApiType, GeminiModelType, ModelResponse } from "../shared/types";
import { Service } from "./service";
import {
  GoogleGenerativeAI,
  GenerationConfig,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";
import { SettingsService } from "./settings_service";
import { ToastService } from "./toast_service";

const DEFAULT_FETCH_TIMEOUT = 300 * 1000; // This is the Chrome default.
const MAX_TOKENS_FINISH_REASON = "MAX_TOKENS";
const QUOTA_ERROR_CODE = 429;

interface ServiceProvider {
  settingsService: SettingsService;
  toastService: ToastService;
}

interface CallPredictRequest {
  prompt: string;
}

const SAFETY_SETTINGS = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
];

/**
 * Handles API requests.
 */
export class ApiService extends Service {
  apiKey: string | undefined = undefined;
  genAI: GoogleGenerativeAI | undefined = undefined;

  constructor(private readonly sp: ServiceProvider) {
    super();
  }

  hasApiKey(): boolean {
    return this.apiKey !== undefined && this.apiKey !== "";
  }

  setApiKey(key: string | undefined) {
    this.apiKey = key;

    if (key === undefined) {
      this.genAI = undefined;
      return;
    }

    this.genAI = new GoogleGenerativeAI(key);
  }

  async callGemini(
    prompt: string,
    generationConfig: GenerationConfig,
    model_name = "gemini-1.5-pro-latest"
  ) {
    const model = this.genAI.getGenerativeModel({
      model: model_name,
      generationConfig,
      safetySettings: SAFETY_SETTINGS,
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;

    const finishReason = response.candidates[0].finishReason;
    if (finishReason === MAX_TOKENS_FINISH_REASON) {
      this.sp.toastService.showToast(
        "Token limit exceeded - increase Max tokens in Settings."
      );
    }

    return { text: response.text() };
  }

  async callPredict(
    promptText: string,
    stopTokens: string[] = [],
    temperature = 0.5,
    topP = 0.1,
    topK = 16
  ): Promise<ModelResponse> {
    // Use the max tokens specified in Settings
    const maxTokens = this.sp.settingsService.maxTokens;

    // Log the request
    console.log(
      "callPredict",
      "prompt:",
      promptText,
      "stopTokens:",
      stopTokens,
      "maxTokens:",
      maxTokens
    );
    const request: CallPredictRequest = {
      prompt: `${promptText} {{ llm(stop=[${stopTokens
        .map((token) => `"${token}"`)
        .join(",")}], max_tokens=${maxTokens}) }}`,
    };

    const generationConfig = {
      stopSequences: stopTokens,
      maxOutputTokens: maxTokens,
      temperature,
      topP,
      topK,
    };

    let response = { text: "" };
    try {
      if (this.sp.settingsService.apiType === ApiType.AI_STUDIO) {
        response = await this.callGemini(
          promptText,
          generationConfig,
          this.sp.settingsService.model
        );
      }
    } catch (error) {
      if (error.message.includes(QUOTA_ERROR_CODE.toString())) {
        this.sp.toastService.showToast("API quota exceeded");
      } else {
        this.sp.toastService.showToast("API error");
      }
      console.log(error);
    }

    // Log the response
    console.log(response);
    return response;
  }
}
