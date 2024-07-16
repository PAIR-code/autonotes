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

import "../../pair-components/dialog";
import "./tos_content";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";

import { Note, ProjectMetadata, RawObject } from "../../shared/types";
import { EXAMPLE_PROJECTS } from "../../shared/examples/utils";

import { core } from "../../core/core";
import { SettingsService } from "../../services/settings_service";
import { StorageService } from "../../services/storage_service";

import { styles } from "./project_dialog.scss";
import { styles as cardStyles } from "./project_card.scss";

/** Project dialog for replacing current project with selected example. */
@customElement("project-dialog")
export class ProjectDialog extends MobxLitElement {
  static override styles: CSSResultGroup = [styles, cardStyles];

  private readonly settingsService = core.getService(SettingsService);
  private readonly storageService = core.getService(StorageService);

  @state() metadata: ProjectMetadata | null = null;
  @state() project: RawObject | null = null;

  @state() acceptedTOS = false;

  override updated() {
    if (this.settingsService.isImportExampleProject) {
      this.acceptedTOS = true;
    }
  }

  override render() {
    const showDialog =
      this.settingsService.isOnboarding ||
      this.settingsService.isImportExampleProject;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        this.closeDialog();
      }
    };

    return html`
      <pr-dialog .showDialog=${showDialog} @keydown=${handleKeyDown}>
        ${this.renderTOS()}
        ${this.renderProjectSelection()}
      </pr-dialog>
    `;
  }

  closeDialog() {
    this.settingsService.setOnboarding(false);
    this.settingsService.setImportExampleProject(false);
  }

  renderTOS() {
    if (this.acceptedTOS) {
      return nothing;
    }

    const handleClick = () => {
      this.acceptedTOS = true;
    }

    return html`
      <div class="content">
        <h1>📝 Welcome to AutoNotes</h1>
        <tos-content></tos-content>
        <div class="action-buttons">
          <pr-button color="tertiary" variant="outlined" @click=${handleClick}>
            Acknowledge
          </pr-button>
        </div>
      </div>
    `;
  }

  renderProjectSelection() {
    if (!this.acceptedTOS) {
      return nothing;
    }

    const handleContinueClick = () => {
      if (
        !this.settingsService.isOnboarding &&
        this.settingsService.isImportExampleProject
      ) {
        // Import as new project (if not in onboarding state)
        this.storageService.createNewProject(this.project, this.metadata);
      } else if (this.metadata !== null) {
        // Load example project (if in onboarding state)
        this.storageService.loadProjectFromDisk(this.project);

        const currentId = this.settingsService.selectedProjectId;
        this.settingsService.updateSelectedProject({
          ...this.metadata,
          id: currentId,
          dateCreated: new Date(),
        });
      }

      // Close dialog
      this.closeDialog();
    };

    const isDisabled =
      this.settingsService.isImportExampleProject && this.project === null;

    return html`
      <div class="content">
        ${this.renderContent()}
        <div class="card-wrapper">
          ${this.renderBlankCard()}
          ${EXAMPLE_PROJECTS.map((info) => this.renderExampleCard(info))}
        </div>
        <div class="action-buttons">
          ${this.renderCancelButton()}
          <pr-button ?disabled=${isDisabled} @click=${handleContinueClick}>
            Continue
          </pr-button>
        </div>
      </div>
    `;
  }

  renderContent() {
    if (this.settingsService.isOnboarding) {
      return html`
        <h1>👋 Welcome to AutoNotes!</h1>
        <p>
          Choose a project to get started. (You can adjust this later in
          Settings.)
        </p>
      `;
    }

    return html`
      <h1>
        Add example project
        <h1>
          <p>Choose an example project below.</p>
        </h1>
      </h1>
    `;
  }

  renderCancelButton() {
    if (this.settingsService.isOnboarding) {
      return nothing;
    }

    return html`
      <pr-button color="neutral" variant="default" @click=${this.closeDialog}>
        Cancel
      </pr-button>
    `;
  }

  renderExampleCard(info: { metadata: ProjectMetadata; project: RawObject }) {
    const classes = classMap({
      card: true,
      outlined: true,
      selected: this.metadata?.id === info.metadata.id,
    });

    const handleClick = () => {
      this.metadata = info.metadata;
      this.project = info.project;
    };

    return html`
      <div class=${classes}" @click=${handleClick}>
        <div class="card--title">${info.metadata.title}</div>
        <div class="card--description">${info.metadata.description}</div>
      </div>
    `;
  }

  renderBlankCard() {
    if (!this.settingsService.isOnboarding) {
      return nothing;
    }

    const classes = classMap({
      card: true,
      outlined: true,
      selected: this.metadata === null,
    });

    const handleClick = () => {
      this.metadata = null;
      this.project = null;
    };

    return html`
      <div class=${classes}" @click=${handleClick}>
        <div class="card--title">Blank Project</div>
        <div class="card--description">Start with an empty project</div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "project-dialog": ProjectDialog;
  }
}
