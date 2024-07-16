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
  makeOnboardingChat,
  makeOnboardingNotes,
  makeOnboardingTagSummary,
  ONBOARDING_NOTE_INFO_ID,
  ONBOARDING_NOTE_INTRO_ID,
} from "../shared/initial_data";

import { toJS } from "mobx";

import {
  ApiType,
  ChatMessage,
  ColorTheme,
  GeminiModelType,
  Note,
  ProjectMetadata,
  PromptCall,
  RawObject,
  Tag,
  TagSummaryItem,
  TextSize,
} from "../shared/types";
import {
  createBlankProjectMetadata,
  downloadJsonObj,
  generateNewId,
} from "../shared/utils";

import { ChatService } from "./chat_service";
import { IndexedDbService } from "./indexed_db_service";
import { NotebookService } from "./notebook_service";
import { PromptHistoryService } from "./prompt_history_service";
import { SettingsService } from "./settings_service";
import { Service } from "./service";

interface ServiceProvider {
  notebookService: NotebookService;
  chatService: ChatService;
  promptHistoryService: PromptHistoryService;
  settingsService: SettingsService;
  indexedDbService: IndexedDbService;
}

/** Manages reading / writing to IndexedDB storage. */
export class StorageService extends Service {
  constructor(private readonly sp: ServiceProvider) {
    super();
  }

  private selectedProjectId(): string {
    return this.sp.settingsService.selectedProjectId;
  }

  private loadNotebook(projectId = this.selectedProjectId()) {
    const onSuccess = (indexedDbNotes: Note[]) => {
      let notes: Note[] = [...indexedDbNotes];
      if (notes.length === 0) {
        notes = makeOnboardingNotes();
      }

      this.sp.notebookService.setNotes(notes);

      this.saveNotebook();
    };

    this.sp.indexedDbService.loadNotebookData(projectId, onSuccess);

    const onTagsSuccess = (indexedDbPinnedTags: Tag[]) => {
      const pinnedTags: Tag[] = [...indexedDbPinnedTags];

      this.sp.notebookService.tagHelper.setPinnedTags(pinnedTags);
      this.saveNotebook();
    };

    this.sp.indexedDbService.loadPinnedTagsData(projectId, onTagsSuccess);

    const onTagSummarySuccess = (tagSummaryItems: TagSummaryItem[]) => {
      // If has onboarding notes, make sure tag summaries are present
      if (
        this.sp.notebookService.notes.find(note => note.id === ONBOARDING_NOTE_INTRO_ID) &&
        this.sp.notebookService.notes.find(note => note.id === ONBOARDING_NOTE_INFO_ID)
      ) {
        if (tagSummaryItems.find(item => item.tag === "notetaking/autonotes") === undefined) {
          tagSummaryItems.push(makeOnboardingTagSummary("notetaking/autonotes"));
        }
        if (tagSummaryItems.find(item => item.tag === "notetaking") === undefined) {
          tagSummaryItems.push(makeOnboardingTagSummary("notetaking"));
        }
      }

      this.sp.notebookService.setTagSummaries(tagSummaryItems);
      this.saveNotebook();
    };
    this.sp.indexedDbService.loadTagSummariesData(
      projectId,
      onTagSummarySuccess
    );
  }

  saveNotebook(projectId = this.selectedProjectId()) {
    const notes = this.sp.notebookService.notes;
    this.sp.indexedDbService.setNotebookData(projectId, notes);
    this.sp.indexedDbService.setPinnedTagsData(
      projectId,
      this.sp.notebookService.tagHelper.pinnedTags
    );
    this.sp.indexedDbService.setTagSummariesData(
      projectId,
      this.sp.notebookService.getTagSummariesList()
    );
    this.savePromptHistory();
  }

  loadChat(projectId = this.selectedProjectId()) {
    const onSuccess = (indexedDbChats: ChatMessage[]) => {
      let chats: ChatMessage[] = [...indexedDbChats];
      if (chats.length === 0) {
        chats = makeOnboardingChat();
      }

      this.sp.chatService.setChat(chats);
      this.saveChat();
    };

    this.sp.indexedDbService.loadChatData(projectId, onSuccess);
  }

  saveChat(projectId = this.selectedProjectId()) {
    const chat = this.sp.chatService.chats;
    this.sp.indexedDbService.setChatData(projectId, chat);

    this.savePromptHistory();
  }

  private loadPromptHistory(projectId = this.selectedProjectId()) {
    const onSuccess = (indexedDbPromptHistory: PromptCall[]) => {
      const promptHistory: PromptCall[] = [...indexedDbPromptHistory];

      this.sp.promptHistoryService.setPromptCalls(promptHistory);

      this.savePromptHistory();
    };

    this.sp.indexedDbService.loadPromptHistoryData(projectId, onSuccess);
  }

  private savePromptHistory(projectId = this.selectedProjectId()) {
    const promptHistory = this.sp.promptHistoryService.promptCalls;
    this.sp.indexedDbService.setPromptHistoryData(projectId, promptHistory);
  }

  /** Loads app-wide settings except project metadata, selected project. */
  private loadGeneralSettings() {
    this.sp.indexedDbService.loadSettingsApiType((apiType: ApiType) => {
      this.sp.settingsService.setApiType(apiType);
    });

    this.sp.indexedDbService.loadSettingsApiKey((apiKey: string) => {
      this.sp.settingsService.setApiKey(apiKey);
    });

    this.sp.indexedDbService.loadSettingsMaxTokens((maxTokens: number) => {
      this.sp.settingsService.setMaxTokens(maxTokens);
    });

    this.sp.indexedDbService.loadSettingsModel((model: GeminiModelType) => {
      this.sp.settingsService.setModel(model);
    });

    this.sp.indexedDbService.loadSettingsOnboarding((onboarding: boolean) => {
      this.sp.settingsService.setOnboarding(onboarding);
    });

    this.sp.indexedDbService.loadSettingsColorTheme((theme: ColorTheme) => {
      this.sp.settingsService.setColorTheme(theme);
    });

    this.sp.indexedDbService.loadSettingsTextSize((size: TextSize) => {
      this.sp.settingsService.setTextSize(size);
    });
  }

  /** Loads project metadata, selected project id, and project content
   *  (including notes, chat, etc).
   */
  private loadProjectOnInit() {
    this.sp.indexedDbService.getProjects((projects: ProjectMetadata[]) => {
      if (projects.length === 0) {
        projects.push(createBlankProjectMetadata());
      }
      this.sp.settingsService.setProjects(projects, /* save */ false);

      this.sp.indexedDbService.loadSettingsSelectedProjectId(
        (selectedProjectId: string) => {
          const projectIdExists = projects.find(
            (project) => project.id === selectedProjectId
          );

          if (!projectIdExists) {
            selectedProjectId = projects[0].id;
          }

          // Sets and loads the selected project.
          this.sp.settingsService.setSelectedProject(
            selectedProjectId,
            /* load */ true
          );
        }
      );
    });
  }

  /**
   * Creates and sets new selected project.
   * If project is specified, load it from disk. Otherwise, load blank project.
   */
  createNewProject(
    project: RawObject | null = null,
    metadata: ProjectMetadata | null = null
  ) {
    const newProject =
      metadata === null
        ? createBlankProjectMetadata()
        : { ...metadata, id: generateNewId() };

    const currentProjects = this.sp.settingsService.projects;
    this.sp.settingsService.setProjects([
      ...this.sp.settingsService.projects,
      newProject,
    ]);

    if (project === null) {
      this.sp.settingsService.setSelectedProject(newProject.id);
    } else {
      this.sp.settingsService.setSelectedProject(newProject.id, false);
      this.loadProjectFromDisk(project);
    }
  }

  /** Saves app-wide settings except for projects, selected project. */
  saveGeneralSettings() {
    this.sp.indexedDbService.setSettingsApiType(
      this.sp.settingsService.apiType
    );

    this.sp.indexedDbService.setSettingsApiKey(this.sp.settingsService.apiKey);

    this.sp.indexedDbService.setSettingsMaxTokens(
      this.sp.settingsService.maxTokens
    );

    this.sp.indexedDbService.setSettingsModel(this.sp.settingsService.model);

    this.sp.indexedDbService.setSettingsOnboarding(
      this.sp.settingsService.isOnboarding
    );

    this.sp.indexedDbService.setSettingsColorTheme(
      this.sp.settingsService.colorTheme
    );

    this.sp.indexedDbService.setSettingsTextSize(
      this.sp.settingsService.textSize
    );
  }

  /** Save project metadata, selected project settings. */
  saveProjectSettings() {
    this.sp.indexedDbService.setSettingsSelectedProjectId(
      this.sp.settingsService.selectedProjectId
    );

    this.sp.indexedDbService.setProjects(
      toJS(this.sp.settingsService.projects)
    );
  }

  save() {
    this.saveGeneralSettings();
    this.saveProjectSettings();
    this.saveProject();
  }

  saveProject(projectId = this.selectedProjectId()) {
    this.saveNotebook(projectId);
    this.saveChat();
    this.savePromptHistory();
  }

  load() {
    const onSuccess = () => {
      this.loadGeneralSettings();

      // Load project settings (including notes/chat/etc. for selected project)
      this.loadProjectOnInit();
    };

    this.sp.indexedDbService.initializeIndexedDb(onSuccess);
  }

  loadProject(projectId = this.selectedProjectId()) {
    this.loadNotebook(projectId);
    this.loadChat(projectId);
    this.loadPromptHistory(projectId);
  }

  exportToDisk() {
    const exportObj = {
      notes: this.sp.notebookService.notes,
      chat: this.sp.chatService.chats,
      promptHistory: this.sp.promptHistoryService.promptCalls,
      pinnedTags: this.sp.notebookService.tagHelper.pinnedTags,
      tagSummaries: this.sp.notebookService.getTagSummariesList(),
      metadata: this.sp.settingsService.selectedProject,
    };

    const date = new Date();

    downloadJsonObj(
      exportObj,
      `autonotes_project_${date.toLocaleDateString()}_${date.toLocaleTimeString()}`
    );
  }

  /** Adds notes from given project to current selected project. */
  importNotesFromProject(importedObject: RawObject) {
    if (importedObject["notes"]) {
      const existingNotes: Note[] = this.sp.notebookService.notes;
      const newNotes = importedObject["notes"] as Note[];
      this.sp.notebookService.setNotes([...existingNotes, ...newNotes]);
      this.saveNotebook();
    } else {
      console.log("Import error: 'notes' field missing from JSON");
    }
  }

  /** Imports project from disk (overrides current selected project) .*/
  loadProjectFromDisk(importedObject: RawObject) {
    // First, clear content from existing project
    this.sp.notebookService.setNotes([]);
    this.sp.chatService.setChat(makeOnboardingChat());
    this.sp.promptHistoryService.setPromptCalls([]);
    this.sp.notebookService.tagHelper.setPinnedTags([]);
    this.sp.notebookService.setTagSummaries([]);

    // Load new project
    if (importedObject["notes"]) {
      this.sp.notebookService.setNotes(importedObject["notes"] as Note[]);
    }
    if (importedObject["chat"]) {
      this.sp.chatService.setChat(importedObject["chat"] as ChatMessage[]);
    }
    if (importedObject["promptHistory"]) {
      this.sp.promptHistoryService.setPromptCalls(
        importedObject["promptHistory"] as PromptCall[]
      );
    }
    if (importedObject["pinnedTags"]) {
      this.sp.notebookService.tagHelper.setPinnedTags(
        importedObject["pinnedTags"] as Tag[]
      );
    }
    if (importedObject["tagSummaries"]) {
      this.sp.notebookService.setTagSummaries(
        importedObject["tagSummaries"] as TagSummaryItem[]
      );
    }
    if (importedObject["metadata"]) {
      this.sp.settingsService.updateSelectedProject({
        ...(importedObject["metadata"] as ProjectMetadata),
        id: this.sp.settingsService.selectedProjectId,
      });
    }

    // Save the imported data to storage.
    this.save();
  }

  clearAllData() {
    this.sp.indexedDbService.clear();
    location.reload();
  }
}
