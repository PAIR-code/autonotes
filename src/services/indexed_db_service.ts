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

import {
  ApiType,
  ChatMessage,
  ColorTheme,
  GeminiModelType,
  Note,
  ProjectMetadata,
  PromptCall,
  TagSummaryItem,
  TextSize,
} from "../shared/types";

import { createBlankProjectMetadata } from "../shared/utils";

import { Service } from "./service";

import {
  CHAT_OBJECT_STORE,
  DATABASE_NAME,
  NOTEBOOK_OBJECT_STORE,
  PINNED_TAGS_OBJECT_STORE,
  PROJECTS_OBJECT_STORE,
  PROMPT_HISTORY_OBJECT_STORE,
  SETTINGS_OBJECT_STORE,
  SETTINGS_API_TYPE,
  SETTINGS_API_KEY,
  SETTINGS_COLOR_THEME_KEY,
  SETTINGS_MODEL_KEY,
  SETTINGS_MAX_TOKENS_KEY,
  SETTINGS_TEXT_SIZE_KEY,
  SETTINGS_ONBOARDING_KEY,
  SETTINGS_SELECTED_PROJECT_KEY,
  TAG_SUMMARY_OBJECT_STORE,
} from "../shared/constants";

const KEY = "key";
const VALUE = "value";

interface KeyValueObject {
  key: string;
  value: string;
}

/** Options for data storage (stringify JSON, wrap in key-value structure). */
interface DataStoreOptions {
  processJSON: boolean;
  useKeyValueObject: boolean;
}

/** Manages reading and writing to IndexedDB. */
export class IndexedDbService extends Service {
  private indexedDb: IDBDatabase | undefined = undefined;

  initializeIndexedDb(onSuccess: () => void) {
    // Open a connection to the IndexedDB database
    const request = indexedDB.open(DATABASE_NAME, 1);

    request.onupgradeneeded = (event: any) => {
      // Set up chat object store
      event.target.result.createObjectStore(CHAT_OBJECT_STORE, {
        keyPath: KEY,
      });
      // Set up notebook object store
      event.target.result.createObjectStore(NOTEBOOK_OBJECT_STORE, {
        keyPath: KEY,
      });
      // Set up prompt history object store
      event.target.result.createObjectStore(PROMPT_HISTORY_OBJECT_STORE, {
        keyPath: KEY,
      });
      // Set up pinned tags object store
      event.target.result.createObjectStore(PINNED_TAGS_OBJECT_STORE, {
        keyPath: KEY,
      });
      // Set up tag summary object store
      event.target.result.createObjectStore(TAG_SUMMARY_OBJECT_STORE, {
        keyPath: KEY,
      });
      // Set up settings object store
      event.target.result.createObjectStore(SETTINGS_OBJECT_STORE, {
        keyPath: KEY,
      });
      // Set up projects object store
      event.target.result.createObjectStore(PROJECTS_OBJECT_STORE, {
        keyPath: "id",
      });
    };

    request.onsuccess = () => {
      this.indexedDb = request.result;

      onSuccess();
      console.log("Successfully initialized indexed db");
    };
  }

  clear() {
    if (!this.indexedDb) return;

    const objectStores = [
      NOTEBOOK_OBJECT_STORE,
      CHAT_OBJECT_STORE,
      PROMPT_HISTORY_OBJECT_STORE,
      PINNED_TAGS_OBJECT_STORE,
      SETTINGS_OBJECT_STORE,
      TAG_SUMMARY_OBJECT_STORE,
      PROJECTS_OBJECT_STORE,
    ];

    objectStores.forEach((name: string) => {
      const transaction = this.indexedDb.transaction([name], "readwrite");
      const objectStore = transaction.objectStore(name);
      objectStore.clear();
    });
  }

  /** Returns all keys from project object store. */
  getProjectIds(onSuccess: (ids: string[]) => void) {
    if (!this.indexedDb) return;

    const transaction = this.indexedDb.transaction([PROJECTS_OBJECT_STORE]);
    const store = transaction.objectStore(PROJECTS_OBJECT_STORE);
    const request = store.getAllKeys();

    request.onsuccess = (event: any) => {
      const object = request.result;
      if (object) {
        onSuccess(object.map((key: any) => key as string));
      }
    };
  }

  /** Returns all projects from project object store. */
  getProjects(onSuccess: (projects: ProjectMetadata[]) => void) {
    if (!this.indexedDb) return;

    const transaction = this.indexedDb.transaction([PROJECTS_OBJECT_STORE]);
    const store = transaction.objectStore(PROJECTS_OBJECT_STORE);
    const request = store.getAll();

    request.onsuccess = (event: any) => {
      const object = request.result;
      if (object) {
        onSuccess(object);
      }
    };
  }

  /** Stores data in IndexedDB. */
  setData<T>(
    objectStore: string,
    key: string,
    value: T,
    options: DataStoreOptions = { processJSON: false, useKeyValueObject: false }
  ) {
    if (!this.indexedDb) return;

    const transaction = this.indexedDb.transaction([objectStore], "readwrite");

    const store = transaction.objectStore(objectStore);

    if (options.useKeyValueObject) {
      const object: { [key: string]: T | string } = {};

      object[KEY] = key;
      object[VALUE] = options.processJSON ? JSON.stringify(value) : value;

      store.put(object);
    } else {
      store.put(value);
    }
  }

  /** Returns data from IndexedDB. */
  getData<T>(
    objectStore: string,
    key: string,
    defaultValue: T,
    onSuccess: (value: T) => void,
    options: DataStoreOptions = { processJSON: false, useKeyValueObject: false }
  ): void {
    if (!this.indexedDb) return;

    const transaction = this.indexedDb.transaction([objectStore]);
    const store = transaction.objectStore(objectStore);
    const request = store.get(key);

    request.onsuccess = (event: any) => {
      const object = request.result;

      if (object) {
        if (options.useKeyValueObject) {
          const value = options.processJSON
            ? (JSON.parse(object.value) as T)
            : (object.value as T);

          onSuccess(value);
        } else {
          onSuccess(object);
        }
      } else {
        onSuccess(defaultValue);
      }
    };
  }

  setNotebookData(key: string, notes: Note[]) {
    const options: DataStoreOptions = {
      processJSON: true,
      useKeyValueObject: true,
    };
    this.setData<Note[]>(NOTEBOOK_OBJECT_STORE, key, notes, options);
  }

  loadNotebookData(key: string, onSuccess: (value: Note[]) => void) {
    const options: DataStoreOptions = {
      processJSON: true,
      useKeyValueObject: true,
    };
    this.getData<Note[]>(NOTEBOOK_OBJECT_STORE, key, [], onSuccess, options);
  }

  setChatData(key: string, chats: ChatMessage[]) {
    const options: DataStoreOptions = {
      processJSON: true,
      useKeyValueObject: true,
    };
    this.setData<ChatMessage[]>(CHAT_OBJECT_STORE, key, chats, options);
  }

  loadChatData(key: string, onSuccess: (value: ChatMessage[]) => void) {
    const options: DataStoreOptions = {
      processJSON: true,
      useKeyValueObject: true,
    };
    this.getData<ChatMessage[]>(CHAT_OBJECT_STORE, key, [], onSuccess, options);
  }

  setPromptHistoryData(key: string, promptCalls: PromptCall[]) {
    const options: DataStoreOptions = {
      processJSON: true,
      useKeyValueObject: true,
    };
    this.setData<PromptCall[]>(
      PROMPT_HISTORY_OBJECT_STORE,
      key,
      promptCalls,
      options
    );
  }

  loadPromptHistoryData(key: string, onSuccess: (value: PromptCall[]) => void) {
    const options: DataStoreOptions = {
      processJSON: true,
      useKeyValueObject: true,
    };
    this.getData<PromptCall[]>(
      PROMPT_HISTORY_OBJECT_STORE,
      key,
      [],
      onSuccess,
      options
    );
  }

  setTagSummariesData(key: string, tagSummariesList: TagSummaryItem[]) {
    const options: DataStoreOptions = {
      processJSON: true,
      useKeyValueObject: true,
    };
    this.setData<TagSummaryItem[]>(
      TAG_SUMMARY_OBJECT_STORE,
      key,
      tagSummariesList,
      options
    );
  }

  loadTagSummariesData(
    key: string,
    onSuccess: (value: TagSummaryItem[]) => void
  ) {
    const options: DataStoreOptions = {
      processJSON: true,
      useKeyValueObject: true,
    };
    this.getData<TagSummaryItem[]>(
      TAG_SUMMARY_OBJECT_STORE,
      key,
      [],
      onSuccess,
      options
    );
  }

  setPinnedTagsData(key: string, pinnedTags: string[]) {
    const options: DataStoreOptions = {
      processJSON: true,
      useKeyValueObject: true,
    };
    this.setData<string[]>(PINNED_TAGS_OBJECT_STORE, key, pinnedTags, options);
  }

  loadPinnedTagsData(key: string, onSuccess: (value: string[]) => void) {
    const options: DataStoreOptions = {
      processJSON: true,
      useKeyValueObject: true,
    };
    this.getData<string[]>(
      PINNED_TAGS_OBJECT_STORE,
      key,
      [],
      onSuccess,
      options
    );
  }

  setProject(project: ProjectMetadata) {
    this.setData<ProjectMetadata>(PROJECTS_OBJECT_STORE, project.id, project);
  }

  setProjects(projects: ProjectMetadata[]) {
    projects.forEach((project) => {
      this.setProject(project);
    });
  }

  loadProject(key: string, onSuccess: (value: ProjectMetadata) => void) {
    const emptyProject = createBlankProjectMetadata();

    this.getData<ProjectMetadata>(
      PROJECTS_OBJECT_STORE,
      key,
      emptyProject,
      onSuccess
    );
  }

  setSettingsApiType(apiType: ApiType) {
    const options: DataStoreOptions = {
      processJSON: false,
      useKeyValueObject: true,
    };
    this.setData<ApiType>(
      SETTINGS_OBJECT_STORE,
      SETTINGS_API_TYPE,
      apiType,
      options
    );
  }

  loadSettingsApiType(onSuccess: (value: ApiType) => void) {
    const options: DataStoreOptions = {
      processJSON: false,
      useKeyValueObject: true,
    };
    this.getData<ApiType>(
      SETTINGS_OBJECT_STORE,
      SETTINGS_API_TYPE,
      ApiType.AI_STUDIO,
      onSuccess,
      options
    );
  }

  setSettingsApiKey(apiKey: string) {
    const options: DataStoreOptions = {
      processJSON: false,
      useKeyValueObject: true,
    };
    this.setData<string>(
      SETTINGS_OBJECT_STORE,
      SETTINGS_API_KEY,
      apiKey,
      options
    );
  }

  loadSettingsApiKey(onSuccess: (value: string) => void) {
    const options: DataStoreOptions = {
      processJSON: false,
      useKeyValueObject: true,
    };
    this.getData<string>(
      SETTINGS_OBJECT_STORE,
      SETTINGS_API_KEY,
      "",
      onSuccess,
      options
    );
  }

  setSettingsMaxTokens(maxTokens: number) {
    const options: DataStoreOptions = {
      processJSON: false,
      useKeyValueObject: true,
    };
    this.setData<number>(
      SETTINGS_OBJECT_STORE,
      SETTINGS_MAX_TOKENS_KEY,
      maxTokens,
      options
    );
  }

  loadSettingsMaxTokens(onSuccess: (value: number) => void) {
    const options: DataStoreOptions = {
      processJSON: false,
      useKeyValueObject: true,
    };
    this.getData<number>(
      SETTINGS_OBJECT_STORE,
      SETTINGS_MAX_TOKENS_KEY,
      1000,
      onSuccess,
      options
    );
  }

  setSettingsModel(model: GeminiModelType) {
    const options: DataStoreOptions = {
      processJSON: false,
      useKeyValueObject: true,
    };
    this.setData<GeminiModelType>(
      SETTINGS_OBJECT_STORE,
      SETTINGS_MODEL_KEY,
      model,
      options
    );
  }

  loadSettingsModel(onSuccess: (model: GeminiModelType) => void) {
    const options: DataStoreOptions = {
      processJSON: false,
      useKeyValueObject: true,
    };
    this.getData<GeminiModelType>(
      SETTINGS_OBJECT_STORE,
      SETTINGS_MODEL_KEY,
      GeminiModelType.GEMINI_PRO,
      onSuccess,
      options
    );
  }

  setSettingsOnboarding(isOnboarding: boolean) {
    const options: DataStoreOptions = {
      processJSON: false,
      useKeyValueObject: true,
    };
    this.setData<Boolean>(
      SETTINGS_OBJECT_STORE,
      SETTINGS_ONBOARDING_KEY,
      isOnboarding,
      options
    );
  }

  loadSettingsOnboarding(onSuccess: (value: boolean) => void) {
    const options: DataStoreOptions = {
      processJSON: false,
      useKeyValueObject: true,
    };
    this.getData<Boolean>(
      SETTINGS_OBJECT_STORE,
      SETTINGS_ONBOARDING_KEY,
      true,
      onSuccess,
      options
    );
  }

  setSettingsColorTheme(colorTheme: ColorTheme) {
    const options: DataStoreOptions = {
      processJSON: false,
      useKeyValueObject: true,
    };
    this.setData<ColorTheme>(
      SETTINGS_OBJECT_STORE,
      SETTINGS_COLOR_THEME_KEY,
      colorTheme,
      options
    );
  }

  loadSettingsColorTheme(onSuccess: (value: ColorTheme) => void) {
    const options: DataStoreOptions = {
      processJSON: false,
      useKeyValueObject: true,
    };
    this.getData<ColorTheme>(
      SETTINGS_OBJECT_STORE,
      SETTINGS_COLOR_THEME_KEY,
      ColorTheme.WINTERGLOW_LIGHT,
      onSuccess,
      options
    );
  }

  setSettingsTextSize(textSize: TextSize) {
    const options: DataStoreOptions = {
      processJSON: false,
      useKeyValueObject: true,
    };
    this.setData<string>(
      SETTINGS_OBJECT_STORE,
      SETTINGS_TEXT_SIZE_KEY,
      textSize,
      options
    );
  }

  loadSettingsTextSize(onSuccess: (value: TextSize) => void) {
    const options: DataStoreOptions = {
      processJSON: false,
      useKeyValueObject: true,
    };
    this.getData<string>(
      SETTINGS_OBJECT_STORE,
      SETTINGS_TEXT_SIZE_KEY,
      TextSize.SMALL,
      onSuccess,
      options
    );
  }

  setSettingsSelectedProjectId(projectId: string) {
    const options: DataStoreOptions = {
      processJSON: false,
      useKeyValueObject: true,
    };
    this.setData<string>(
      SETTINGS_OBJECT_STORE,
      SETTINGS_SELECTED_PROJECT_KEY,
      projectId,
      options
    );
  }

  loadSettingsSelectedProjectId(onSuccess: (value: string) => void) {
    const options: DataStoreOptions = {
      processJSON: false,
      useKeyValueObject: true,
    };
    this.getData<string>(
      SETTINGS_OBJECT_STORE,
      SETTINGS_SELECTED_PROJECT_KEY,
      "",
      onSuccess,
      options
    );
  }
}
