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

import { Ref } from "lit/directives/ref";
import { Service } from "./service";

export const CHAT_SCROLL_KEY = "chat_scroll";
export const NOTES_SCROLL_KEY = "notes_scroll";

/**
 * LLM service
 *
 * Handles LLM interactions, calling LLM + updating NotebookService.
 */
export class ScrollService extends Service {
  scrollElements = new Map<string, Ref<Element>>();

  registerScrollElement(key: string, elementRef: Ref<Element>) {
    this.scrollElements.set(key, elementRef);
  }

  scrollElementToBottom(key: string) {
    const elementRef = this.scrollElements.get(key);

    window.setTimeout(() => {
      if (elementRef && elementRef.value) {
        elementRef.value.scrollTop = elementRef.value.scrollHeight;
      }
    });
  }
}
