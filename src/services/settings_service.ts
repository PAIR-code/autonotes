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

import { action, computed, makeObservable, observable } from "mobx";

import { ApiService } from "./api_service";
import { ChatService } from "./chat_service";
import { NotebookService } from "./notebook_service";
import { PromptHistoryService } from "./prompt_history_service";
import { StorageService } from "./storage_service";
import { Service } from "./service";

import {
  ApiType,
  ColorTheme,
  GeminiModelType,
  ProjectMetadata,
  TextSize,
  QuoteInsight,
  WrappedInsight,
} from "../shared/types";

interface ServiceProvider {
  apiService: ApiService;
  chatService: ChatService;
  notebookService: NotebookService;
  promptHistoryService: PromptHistoryService;
  storageService: StorageService;
}

/**
 * Settings service.
 */
export class SettingsService extends Service {
  constructor(private readonly sp: ServiceProvider) {
    super();
    makeObservable(this);
  }

  @observable apiType: ApiType = ApiType.AI_STUDIO;
  @observable apiKey = "";
  @observable maxTokens = 1000;
  @observable model: GeminiModelType = GeminiModelType.GEMINI_PRO;
  @observable colorTheme: ColorTheme = ColorTheme.WINTERGLOW_LIGHT;
  @observable textSize: TextSize = TextSize.SMALL;
  @observable selectedProjectId = "";
  @observable projects: ProjectMetadata[] = [];
  @observable showDateEditor = false;
  @observable isOnboarding = false;
  @observable isImportExampleProject = false;

  private saveGeneralSettings() {
    this.sp.storageService.saveGeneralSettings();
  }

  private saveProjectSettings() {
    this.sp.storageService.saveProjectSettings();
  }

  @computed get hasApiKey() {
    return this.apiKey !== "";
  }

  @computed get selectedProject() {
    return this.projects.find(
      (project) => project.id === this.selectedProjectId
    );
  }

  @computed get wrappedInsights() {
    return this.selectedProject?.wrappedInsights || [];
  }

  @computed get quoteInsights() {
    return this.selectedProject?.quoteInsights || [];
  }

  @action setWrappedInsights(insights: WrappedInsight[]) {
    this.updateSelectedProject({
      ...this.selectedProject,
      wrappedInsights: insights,
    });
  }

  @action setQuoteInsights(insights: QuoteInsight[]) {
    this.updateSelectedProject({
      ...this.selectedProject,
      quoteInsights: insights,
    });
  }

  @action setOnboarding(isOnboarding: boolean) {
    this.isOnboarding = isOnboarding;
    this.saveGeneralSettings();
  }

  @action setImportExampleProject(isImportExampleProject: boolean) {
    this.isImportExampleProject = isImportExampleProject;
  }

  @action setDateEditor(showDateEditor: boolean) {
    this.showDateEditor = showDateEditor;
  }

  @action setApiType(apiType: ApiType) {
    this.apiType = apiType;
    this.saveGeneralSettings();
  }

  @action setApiKey(apiKey: string) {
    this.apiKey = apiKey;
    this.sp.apiService.setApiKey(apiKey);
    this.saveGeneralSettings();
  }

  @action setMaxTokens(tokens: number) {
    this.maxTokens = tokens;
    this.saveGeneralSettings();
  }

  @action setModel(model: GeminiModelType) {
    this.model = model;
    this.saveGeneralSettings();
  }

  @action setColorTheme(colorTheme: ColorTheme) {
    this.colorTheme = colorTheme;
    this.saveGeneralSettings();
  }

  @action setTextSize(textSize: TextSize) {
    this.textSize = textSize;
    this.saveGeneralSettings();
  }

  @action setSelectedProject(id: string, load = true) {
    if (this.projects.find((project) => project.id === id)) {
      this.selectedProjectId = id;
      this.saveProjectSettings();

      if (load) {
        this.sp.storageService.loadProject(id);
      }
    }
  }

  @action updateSelectedProject(updatedProject: ProjectMetadata) {
    const index = this.projects.findIndex(
      (project) => project.id === this.selectedProjectId
    );

    if (index !== -1) {
      this.setProjects([
        ...this.projects.slice(0, index),
        updatedProject,
        ...this.projects.slice(index + 1),
      ]);
    }
  }

  @action setProjects(projects: ProjectMetadata[], save = true) {
    this.projects = projects;
    if (save) {
      this.saveProjectSettings();
    }
  }
}
