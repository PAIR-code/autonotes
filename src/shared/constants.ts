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

import { WrappedInsight } from "./types";

/** Storage constants */
export const DATABASE_NAME = "autonotes_db";

export const APP_PREFIX = "autonotes-state";
export const NOTEBOOK_KEY = "notes";
export const CHAT_KEY = "chat";
export const PROMPT_HISTORY_KEY = "promptHistory";
export const PINNED_TAGS_KEY = "pinnedTags";

export const NOTEBOOK_OBJECT_STORE = "notes";
export const CHAT_OBJECT_STORE = "chat";
export const TAG_SUMMARY_OBJECT_STORE = "tagSummary";
export const PROMPT_HISTORY_OBJECT_STORE = "promptHistory";
export const PINNED_TAGS_OBJECT_STORE = "pinnedTags";
export const PROJECTS_OBJECT_STORE = "projects";
export const SETTINGS_OBJECT_STORE = "settings";

export const SETTINGS_API_TYPE = "apiType";
export const SETTINGS_API_KEY = "apiKey";
export const SETTINGS_MAX_TOKENS_KEY = "maxTokens";
export const SETTINGS_MODEL_KEY = "model";
export const SETTINGS_COLOR_THEME_KEY = "colorTheme";
export const SETTINGS_TEXT_SIZE_KEY = "textSize";
export const SETTINGS_ONBOARDING_KEY = "onboarding";
export const SETTINGS_SELECTED_PROJECT_KEY = "selectedProjectId";

export const TEXT_ENABLE_API_KEY = "Add an API key in Settings to run";

/** Insights */
export const WRAPPED_INSIGHTS_TEMPLATE: WrappedInsight[] = [
  {
    id: "1",
    prompt:
      "What top 3 hobbies does the author have, based on topics mentioned?",
    response: "",
    label: "Top hobbies",
    color: "tertiary",
  },
  {
    id: "2",
    prompt:
      "What does the author dislike, if you were to guess based on the topics?",
    response: "",
    label: "You disliked",
    color: "error",
  },
  {
    id: "3",
    prompt:
      "Who are the author's 3 favorite people or animals? List their names.",
    response: "",
    label: "Favorite people or animals",
    color: "secondary",
  },
  {
    id: "4",
    prompt:
      "What writing style does the author have? List adjectives or similar writers.",
    response: "",
    label: "Your writing style is",
    color: "secondary",
  },
  {
    id: "5",
    prompt: "What is your overall impression of this author? Use 3 adjectives.",
    response: "",
    label: "You are...",
    color: "tertiary",
  },
];
