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

import "../../pair-components/button";
import "../../pair-components/textarea";
import "./tos_content";
import "@material/web/checkbox/checkbox.js";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import { Ref, createRef, ref } from "lit/directives/ref.js";

import { core } from "../../core/core";
import { ChatService } from "../../services/chat_service";
import { LlmService } from "../../services/llm_service";
import { NotebookService } from "../../services/notebook_service";
import { RouterService } from "../../services/router_service";
import { SettingsService } from "../../services/settings_service";
import { StorageService } from "../../services/storage_service";

import {
  ApiType,
  ColorTheme,
  GeminiModelType,
  RawObject,
  TextSize,
} from "../../shared/types";
import {
  convertKeepToNote,
  convertMarkdownToNote,
  delay,
  removeLeadingHash,
} from "../../shared/utils";

import { styles } from "./settings.scss";
import { TEXT_ENABLE_API_KEY } from "../../shared/constants";
import { ToastService } from "../../services/toast_service";

/** App info view component */
@customElement("settings-component")
export class Settings extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly chatService = core.getService(ChatService);
  private readonly notebookService = core.getService(NotebookService);
  private readonly llmService = core.getService(LlmService);
  private readonly routerService = core.getService(RouterService);
  private readonly settingsService = core.getService(SettingsService);
  private readonly storageService = core.getService(StorageService);
  private readonly toastService = core.getService(ToastService);

  private readonly projectImportRef: Ref<HTMLInputElement> = createRef();
  private readonly notesKeepImportRef: Ref<HTMLInputElement> = createRef();
  private readonly notesMarkdownImportRef: Ref<HTMLInputElement> = createRef();

  @state() tagProgressNumber: number | undefined = undefined;
  @state() tagSummaryProgressNumber: number | undefined = undefined;
  @state() skipTaggedNotes = true;
  @state() skipSummarizedTags = true;

  override render() {
    return html`
      <div class="settings">
        ${this.renderApiSection()} ${this.renderColorThemeSection()}
        ${this.renderTextSizeSection()} ${this.renderProjectSection()}
        ${this.renderDateEditorSection()} ${this.renderClearAllSection()}
        <div class="section">
          <h2>Terms of Service</h2>
          <tos-content></tos-content>
        </div>
      </div>
    `;
  }

  private renderDateEditorSection() {
    return html`
      <div class="section">
        <h2>Date Editor</h2>
        <div class="action-buttons">
          <p>
            This is a dev tool for developing test datasets; when enabled, it
            allows you to edit date created/modified in your notes.
          </p>
          <pr-button
            color=${this.settingsService.showDateEditor ? "primary" : "neutral"}
            variant=${this.settingsService.showDateEditor ? "tonal" : "default"}
            @click=${() => {
              this.settingsService.setDateEditor(true);
            }}
          >
            Editor on
          </pr-button>
          <pr-button
            color=${!this.settingsService.showDateEditor
              ? "primary"
              : "neutral"}
            variant=${!this.settingsService.showDateEditor
              ? "tonal"
              : "default"}
            @click=${() => {
              this.settingsService.setDateEditor(false);
            }}
          >
            Editor off
          </pr-button>
        </div>
      </div>
    `;
  }

  private renderApiSection() {
    const isType = (type: ApiType) => {
      return this.settingsService.apiType === type;
    };

    const isModel = (type: GeminiModelType) => {
      return this.settingsService.model === type;
    };

    const onAIStudioKeyInput = (e: InputEvent) => {
      const value = (e.target as HTMLInputElement).value;

      if (value != null) {
        this.settingsService.setApiKey(value);
      }
    };

    const onMaxTokensInput = (e: InputEvent) => {
      const number = Number((e.target as HTMLInputElement).value);

      if (!isNaN(number)) {
        this.settingsService.setMaxTokens(number);
      }
    };

    const renderModelSelect = () => {
      return html`
        <div class="action-buttons">
          <pr-button
            color=${isModel(GeminiModelType.GEMINI_PRO) ? "primary" : "neutral"}
            variant=${isModel(GeminiModelType.GEMINI_PRO) ? "tonal" : "default"}
            @click=${() => {
              this.settingsService.setModel(GeminiModelType.GEMINI_PRO);
            }}
          >
            Gemini Pro
          </pr-button>
          <pr-button
            color=${isModel(GeminiModelType.GEMINI_PRO_LATEST)
              ? "primary"
              : "neutral"}
            variant=${isModel(GeminiModelType.GEMINI_PRO_LATEST)
              ? "tonal"
              : "default"}
            @click=${() => {
              this.settingsService.setModel(GeminiModelType.GEMINI_PRO_LATEST);
            }}
          >
            Gemini Pro 1.5
          </pr-button>
        </div>
      `;
    };

    const renderAIStudioSetup = () => {
      if (this.settingsService.apiType !== ApiType.AI_STUDIO) {
        return nothing;
      }

      return html`
        <pr-textarea
          label="Gemini API Key"
          placeholder="Paste your API key here"
          variant="outlined"
          .value=${this.settingsService.apiKey}
          @input=${onAIStudioKeyInput}
        >
        </pr-textarea>
      `;
    };

    const renderMaxTokens = () => {
      return html`
        <pr-textarea
          label="Max tokens per prompt call"
          placeholder="Number of tokens"
          variant="outlined"
          .value=${this.settingsService.maxTokens}
          @input=${onMaxTokensInput}
        >
        </pr-textarea>
      `;
    };

    return html`
      <div class="section">
        <h2>Gemini API Setup</h2>
        <div class="primary small">
          Note: An
          <a
            href="https://ai.google.dev/gemini-api/docs/api-key"
            target="_blank"
            >AI Studio Gemini API Key</a
          >
          is required to tag notes, chat with notes, and review insights.
        </div>
        ${renderAIStudioSetup()}
      </div>
      <div class="section">
        <h2>Model settings</h2>
        ${renderModelSelect()} ${renderMaxTokens()}
      </div>
    `;
  }

  private renderColorThemeSection() {
    const handleClick = (theme: ColorTheme) => {
      this.settingsService.setColorTheme(theme);
    };

    const isTheme = (theme: ColorTheme) => {
      return this.settingsService.colorTheme === theme;
    };

    return html`
      <div class="section">
        <h2>Color Theme</h2>
        <div class="action-buttons">
          <pr-button
            color=${isTheme(ColorTheme.SUGARPLUM_LIGHT) ? "primary" : "neutral"}
            variant=${isTheme(ColorTheme.SUGARPLUM_LIGHT) ? "tonal" : "default"}
            @click=${() => {
              handleClick(ColorTheme.SUGARPLUM_LIGHT);
            }}
          >
            Sugarplum Day
          </pr-button>
          <pr-button
            color=${isTheme(ColorTheme.SUGARPLUM_DARK) ? "primary" : "neutral"}
            variant=${isTheme(ColorTheme.SUGARPLUM_DARK) ? "tonal" : "default"}
            @click=${() => {
              handleClick(ColorTheme.SUGARPLUM_DARK);
            }}
          >
            Sugarplum Night
          </pr-button>
          <pr-button
            color=${isTheme(ColorTheme.WINTERGLOW_LIGHT)
              ? "primary"
              : "neutral"}
            variant=${isTheme(ColorTheme.WINTERGLOW_LIGHT)
              ? "tonal"
              : "default"}
            @click=${() => {
              handleClick(ColorTheme.WINTERGLOW_LIGHT);
            }}
          >
            Winterglow Day
          </pr-button>
          <pr-button
            color=${isTheme(ColorTheme.WINTERGLOW_DARK) ? "primary" : "neutral"}
            variant=${isTheme(ColorTheme.WINTERGLOW_DARK) ? "tonal" : "default"}
            @click=${() => {
              handleClick(ColorTheme.WINTERGLOW_DARK);
            }}
          >
            Winterglow Night
          </pr-button>
        </div>
      </div>
    `;
  }

  private renderTextSizeSection() {
    const handleClick = (size: TextSize) => {
      this.settingsService.setTextSize(size);
    };

    const isSize = (size: TextSize) => {
      return this.settingsService.textSize === size;
    };

    return html`
      <div class="section">
        <h2>Text Size</h2>
        <div class="action-buttons">
          <pr-button
            color=${isSize(TextSize.SMALL) ? "tertiary" : "neutral"}
            variant=${isSize(TextSize.SMALL) ? "tonal" : "default"}
            @click=${() => {
              handleClick(TextSize.SMALL);
            }}
          >
            Small
          </pr-button>
          <pr-button
            color=${isSize(TextSize.MEDIUM) ? "tertiary" : "neutral"}
            variant=${isSize(TextSize.MEDIUM) ? "tonal" : "default"}
            @click=${() => {
              handleClick(TextSize.MEDIUM);
            }}
          >
            Medium
          </pr-button>
          <pr-button
            color=${isSize(TextSize.LARGE) ? "tertiary" : "neutral"}
            variant=${isSize(TextSize.LARGE) ? "tonal" : "default"}
            @click=${() => {
              handleClick(TextSize.LARGE);
            }}
          >
            Large
          </pr-button>
        </div>
      </div>
    `;
  }

  private renderTagAllNotesSection() {
    const handleTagAllNotes = async () => {
      const notes = this.notebookService.notes;
      this.tagProgressNumber = 0;
      for (const note of notes) {
        if (!note.tags.length || !this.skipTaggedNotes) {
          await this.llmService.addTagsToNote(note.id);
          await delay(1100);
        }
        this.tagProgressNumber += 1;
      }
      this.tagProgressNumber = undefined;
      this.toastService.showToast("Note tagging completed");
    };

    const isLoading = this.tagProgressNumber !== undefined;

    const disabled = !this.settingsService.apiKey;
    const tooltipText = disabled ? TEXT_ENABLE_API_KEY : "";

    return html`
      <div class="project-subsection">
        <h3>Auto-tag notes</h3>
        <div class="row">
          <p class="primary">
            Warning: This requires up to ${this.notebookService.notes.length}
            model calls.
            ${isLoading
              ? `(${this.tagProgressNumber + 1} / ${
                  this.notebookService.notes.length
                })`
              : nothing}
          </p>
        </div>
        <div class="row actions">
          <label>
            <md-checkbox
              ?checked=${this.skipTaggedNotes}
              @change=${() => {
                this.skipTaggedNotes = !this.skipTaggedNotes;
              }}
            ></md-checkbox>
            Skip tagged notes
          </label>
          <pr-tooltip
            text=${tooltipText}
            color="tertiary"
            variant="outlined"
            position="TOP_LEFT"
          >
            <pr-button
              color="primary"
              variant="tonal"
              .loading=${isLoading}
              @click=${handleTagAllNotes}
              ?disabled=${disabled}
            >
              Auto-tag notes
            </pr-button>
          </pr-tooltip>
        </div>
      </div>
    `;
  }

  private renderGenerateTagSummariesSection() {
    const getAllTags = () =>
      this.notebookService.tags.concat(this.notebookService.categories);
    const handleGenerateTagSummaries = async () => {
      const allTags = getAllTags();

      this.tagSummaryProgressNumber = 0;
      for (const tag of allTags) {
        const tagValue = removeLeadingHash(tag);
        const hasTagSummary = this.notebookService.getTagSummary(tagValue);
        if (!hasTagSummary || !this.skipSummarizedTags) {
          await this.llmService.updateTagSummary(tagValue);
          await delay(1100);
        }
        this.tagSummaryProgressNumber += 1;
      }
      this.tagSummaryProgressNumber = undefined;
      this.toastService.showToast("Summary generation completed");
    };

    const isLoading = this.tagSummaryProgressNumber !== undefined;

    const disabled = !this.settingsService.apiKey;
    const tooltipText = disabled ? TEXT_ENABLE_API_KEY : "";

    const allTagsLength = getAllTags().length;
    return html`
      <div class="project-subsection">
        <h3>Generate tag summaries</h3>
        <div class="row">
          <p class="primary">
            Warning: This requires up to ${allTagsLength} model calls.
            ${isLoading
              ? `(${this.tagSummaryProgressNumber + 1} / ${allTagsLength})`
              : nothing}
          </p>
        </div>
        <div class="row actions">
          <label>
            <md-checkbox
              ?checked=${this.skipSummarizedTags}
              @change=${() => {
                this.skipSummarizedTags = !this.skipSummarizedTags;
              }}
            ></md-checkbox>
            Skip summarized tags
          </label>
          <pr-tooltip
            text=${tooltipText}
            color="tertiary"
            variant="outlined"
            position="TOP_LEFT"
          >
            <pr-button
              color="primary"
              variant="tonal"
              .loading=${isLoading}
              ?disabled=${disabled}
              @click=${handleGenerateTagSummaries}
            >
              Generate summaries
            </pr-button>
          </pr-tooltip>
        </div>
      </div>
    `;
  }

  private renderImportSection() {
    return html`
      <div class="project-subsection">
        <h3>Import notes</h3>
        ${this.renderKeepImportSection()} ${this.renderMarkdownImportSection()}
      </div>
    `;
  }

  private renderKeepImportSection() {
    const handleFiles = (e: InputEvent) => {
      const files: FileList | null = (e.target as HTMLInputElement).files;

      if (files != null && files.length > 0) {
        for (const file of files) {
          let reader = new FileReader();

          reader.addEventListener("load", async () => {
            const note = convertKeepToNote(
              JSON.parse(reader.result as string) as RawObject
            );
            this.notebookService.addImportedNote(note);
          });

          reader.readAsText(file);
        }
        this.toastService.showToast("Keep notes imported");
      }
    };

    const handleImportClick = () => {
      this.notesKeepImportRef.value?.click();
    };

    return html`
      <div class="import">
        <h4>Add Google Keep notes (in JSON format) from Google Takeout</h4>
        <pr-button
          color="secondary"
          padding="small"
          size="small"
          variant="outlined"
          @click=${handleImportClick}
        >
          Import Google Keep notes
          <input
            type="file"
            accept=".json"
            multiple
            ${ref(this.notesKeepImportRef)}
            @change=${handleFiles}
          />
        </pr-button>
      </div>
    `;
  }

  private renderMarkdownImportSection() {
    const handleFiles = (e: InputEvent) => {
      const files: FileList | null = (e.target as HTMLInputElement).files;

      if (files != null && files.length > 0) {
        for (const file of files) {
          let reader = new FileReader();

          reader.addEventListener("load", async () => {
            const note = convertMarkdownToNote(
              reader.result as string,
              file.name.slice(0, -3),
              new Date(file.lastModified)
            );
            this.notebookService.addImportedNote(note);
          });

          reader.readAsText(file);
        }
        this.toastService.showToast("Markdown notes imported");
      }
    };

    const handleImportClick = () => {
      this.notesMarkdownImportRef.value?.click();
    };

    return html`
      <div class="import">
        <h4>Add Markdown files</h4>
        <pr-button
          color="secondary"
          padding="small"
          size="small"
          variant="outlined"
          @click=${handleImportClick}
        >
          Import Markdown notes
          <input
            type="file"
            accept=".md"
            multiple
            ${ref(this.notesMarkdownImportRef)}
            @change=${handleFiles}
          />
        </pr-button>
      </div>
    `;
  }

  private renderPromptHistoryProjectSection() {
    const handleViewHistory = () => {
      this.routerService.navigateToHistoryPage();
    };

    return html`
      <div class="project-subsection">
        <h3>Manage model call history</h3>
        <div class="row">
          <p>View, download, or delete history of calls sent to Gemini API.</p>
          <pr-button
            color="secondary"
            padding="small"
            size="small"
            variant="tonal"
            @click=${handleViewHistory}
          >
            Go to history
          </pr-button>
        </div>
      </div>
    `;
  }

  private renderNotesProjectSection() {
    const handleDeleteHistoryClick = () => {
      this.notebookService.clearNotes();
      this.toastService.showToast("Note history cleared");
    };

    return html`
      <div class="project-subsection">
        <h3>Clear notes</h3>
        <div class="row">
          <p>Delete all notes for current project.</p>
          <pr-button
            color="error"
            padding="small"
            size="small"
            variant="outlined"
            @click=${handleDeleteHistoryClick}
          >
            Clear notes
          </pr-button>
        </div>
      </div>
    `;
  }

  private renderChatProjectSection() {
    const handleDeleteHistoryClick = () => {
      this.chatService.clearHistory();
      this.toastService.showToast("Chat history cleared");
    };

    return html`
      <div class="project-subsection">
        <h3>Clear chat history</h3>
        <div class="row">
          <p>Delete all chat messages for current project.</p>
          <pr-button
            color="error"
            padding="small"
            size="small"
            variant="outlined"
            @click=${handleDeleteHistoryClick}
          >
            Clear chat history
          </pr-button>
        </div>
      </div>
    `;
  }

  private renderImportProjectSection() {
    const handleImportProjectClick = () => {
      this.projectImportRef.value?.click();
    };

    const handleFileSelected = (e: InputEvent) => {
      const files: FileList | null = (e.target as HTMLInputElement).files;
      const reader = new FileReader();

      reader.addEventListener("load", async () => {
        const importedObject = JSON.parse(reader.result as string) as RawObject;
        this.storageService.createNewProject(importedObject);
        this.toastService.showToast("Project imported");
      });

      if (files != null && files.length > 0) {
        reader.readAsText(files[0]);
      }
    };

    return html`
      <div class="project-subsection">
        <h3>Import project</h3>
        <div class="row">
          <p class="primary">
            Warning: This will override your existing notes.
          </p>
          <pr-button
            color="tertiary"
            variant="outlined"
            @click=${handleImportProjectClick}
          >
            Import project
            <input
              type="file"
              accept=".json"
              ${ref(this.projectImportRef)}
              @change=${handleFileSelected}
            />
          </pr-button>
        </div>
      </div>
    `;
  }

  private renderExportProjectSection() {
    const handleExportProject = () => {
      this.storageService.exportToDisk();
      this.toastService.showToast("Project exported");
    };

    return html`
      <div class="project-subsection">
        <h3>Export current project</h3>
        <div class="row">
          <p>Export current project as AutoNotes JSON.</p>
          <pr-button
            color="tertiary"
            padding="small"
            size="small"
            variant="outlined"
            @click=${handleExportProject}
          >
            Export project
          </pr-button>
        </div>
      </div>
    `;
  }

  private renderClearAllSection() {
    const handleClearAll = () => {
      this.storageService.clearAllData();
      this.toastService.showToast("Data cleared");
    };

    return html`
      <div class="section">
        <h2>Delete Data</h2>
        <div class="row">
          <p>Clear all data across all projects. This cannot be undone!</p>
          <pr-button
            color="error"
            padding="small"
            size="small"
            variant="outlined"
            @click=${handleClearAll}
          >
            Delete all data
          </pr-button>
        </div>
      </div>
    `;
  }

  private renderProjectMetadataSection() {
    let title = this.settingsService.selectedProject?.title ?? "";
    let description = this.settingsService.selectedProject?.description ?? "";

    const handleTitleInput = (e: Event) => {
      const value = (e.target as HTMLTextAreaElement).value;

      this.settingsService.updateSelectedProject({
        ...this.settingsService.selectedProject,
        title: value,
      });
    };

    const handleDescriptionInput = (e: Event) => {
      const value = (e.target as HTMLTextAreaElement).value;

      this.settingsService.updateSelectedProject({
        ...this.settingsService.selectedProject,
        description: value,
      });
    };

    return html`
      <div class="project-subsection">
        <h3>Project Title</h3>
        <div class="row">
          <pr-textarea
            placeholder="Title of project"
            variant="outlined"
            .value=${title}
            @input=${handleTitleInput}
          >
          </pr-textarea>
        </div>
      </div>
      <div class="project-subsection">
        <h3>Project Description</h3>
        <div class="row">
          <pr-textarea
            placeholder="Add a project description"
            variant="outlined"
            .value=${description}
            @input=${handleDescriptionInput}
          >
          </pr-textarea>
        </div>
      </div>
    `;
  }

  private renderProjectSection() {
    const handleProjectManagerClick = () => {
      this.routerService.navigateToProjectsPage();
    };

    return html`
      <div class="section">
        <div class="row heading">
          <h2>Current Project</h2>
          <pr-button
            color="secondary"
            padding="small"
            size="small"
            variant="default"
            @click=${handleProjectManagerClick}
          >
            Manage projects
          </pr-button>
        </div>
        <div class="project">
          ${this.renderProjectMetadataSection()}
          ${this.renderTagAllNotesSection()}
          ${this.renderGenerateTagSummariesSection()}
          ${this.renderImportSection()} ${this.renderImportProjectSection()}
          ${this.renderExportProjectSection()}
          ${this.renderPromptHistoryProjectSection()}
          ${this.renderNotesProjectSection()} ${this.renderChatProjectSection()}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "settings-component": Settings;
  }
}
