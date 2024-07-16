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

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html } from "lit";
import { customElement } from "lit/decorators.js";
import { Ref, createRef, ref } from "lit/directives/ref.js";
import { classMap } from "lit/directives/class-map.js";

import { ProjectMetadata, RawObject } from "../../shared/types";

import { core } from "../../core/core";
import { SettingsService } from "../../services/settings_service";
import { StorageService } from "../../services/storage_service";
import { ToastService } from "../../services/toast_service";

import { styles } from "./project_manager.scss";
import { styles as cardStyles } from "./project_card.scss";

/** Project manager component */
@customElement("project-manager-component")
export class ProjectManager extends MobxLitElement {
  static override styles: CSSResultGroup = [styles, cardStyles];

  private readonly settingsService = core.getService(SettingsService);
  private readonly storageService = core.getService(StorageService);
  private readonly toastService = core.getService(ToastService);

  private readonly projectImportRef: Ref<HTMLInputElement> = createRef();

  override render() {
    return html`
      <div class="action-buttons">
        ${this.renderAddBlankProjectCard()}
        ${this.renderAddExampleProjectCard()}
        ${this.renderAddImportedProjectCard()}
      </div>
      <div class="card-wrapper">
        ${this.settingsService.projects.map((p) => this.renderCard(p))}
      </div>
    `;
  }

  renderCard(project: ProjectMetadata) {
    const classes = classMap({
      card: true,
      selected: this.settingsService.selectedProjectId === project.id,
    });

    const handleProjectClick = () => {
      this.settingsService.setSelectedProject(project.id);
    };

    return html`
      <div class=${classes} @click=${handleProjectClick}>
        <div class="card--title">${project.title}</div>
        <div class="card--description">${project.description}</div>
        <div class="card--date">${project.dateCreated}</div>
      </div>
    `;
  }

  renderAddBlankProjectCard() {
    const handleAddProjectClick = () => {
      this.storageService.createNewProject();
    };

    return html`
      <pr-button @click=${handleAddProjectClick}>
        Create new project
      </pr-button>
    `;
  }

  renderAddExampleProjectCard() {
    const handleAddProjectClick = () => {
      this.settingsService.setImportExampleProject(true);
    };

    return html`
      <pr-button
        color="secondary"
        variant="outlined"
        @click=${handleAddProjectClick}
      >
        Add example project
      </pr-button>
    `;
  }

  renderAddImportedProjectCard() {
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
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "project-manager-component": ProjectManager;
  }
}
