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

import { computed, observable, makeObservable } from "mobx";

import { PromptCall } from "../shared/types";
import { downloadJsonObj } from "../shared/utils";
import { ApiService } from "./api_service";
import { ChatService } from "./chat_service";
import { NotebookService } from "./notebook_service";
import { Service } from "./service";

interface ServiceProvider {
  notebookService: NotebookService;
  apiService: ApiService;
  chatService: ChatService;
}

const UNSURE_RESPONSE_TEXT = `Sorry, I'm not sure how to answer that.`;

/**
 * LLM service
 *
 * Handles LLM interactions, calling LLM + updating NotebookService.
 */
export class PromptHistoryService extends Service {
  constructor(private readonly sp: ServiceProvider) {
    super();
    makeObservable(this);
  }

  @observable promptCalls: PromptCall[] = [];

  setPromptCalls(promptCalls: PromptCall[]) {
    this.promptCalls = promptCalls;
  }

  logPromptCall(
    prompt: string,
    response: string,
    processedResponse?: string | string[],
    stopTokens: string[] = [],
    promptName = ""
  ) {
    this.promptCalls.push({
      prompt,
      response,
      processedResponse,
      stopTokens,
      timestamp: new Date(),
      promptName,
    });
  }

  clearPromptCalls() {
    this.promptCalls = [];
  }

  downloadPromptCalls() {
    const date = new Date();

    downloadJsonObj(
      this.promptCalls,
      `prompt_calls_${date.toLocaleDateString()}_${date.toLocaleTimeString()}.json`
    );
  }
}
