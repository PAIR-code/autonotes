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

import "../../pair-components/icon";

import "../chat/chat";
import "../header/header";
import "../history/history";
import "../home/home";
import "../insights/insights_reel";
import "../notebook/notebook";
import "../settings/settings";
import "../settings/project_dialog";
import "../settings/project_manager";
import "../sidenav/sidenav";
import "../tabnav/tabnav";
import "../tag/tag_list";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement } from "lit/decorators.js";
import { core } from "../../core/core";
import { Pages, RouterService } from "../../services/router_service";
import { StorageService } from "../../services/storage_service";
import { SettingsService } from "../../services/settings_service";

import { styles } from "./project.scss";

/** App info view component */
@customElement("project-component")
export class Project extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];
  private readonly routerService = core.getService(RouterService);
  private readonly settingsService = core.getService(SettingsService);
  private readonly storageService = core.getService(StorageService);

  override firstUpdated() {
    this.storageService.load();
  }

  private renderHome() {
    return html`
      <header-component></header-component>
      <div
        id="home-panel"
        class="home-panel"
        role="tabpanel"
        aria-labelledby="home-tab"
      >
        <home-component></home-component>
      </div>
    `;
  }

  private renderNotes(tag = "") {
    return html`
      <header-component></header-component>
      <div
        id="notes-panel"
        class="notes-panel"
        role="tabpanel"
        aria-labelledby="notes-tab"
      >
        <notebook-component tag=${tag}></notebook-component>
      </div>
    `;
  }

  private renderHighlights() {
    return html`
      <header-component></header-component>
      <div
        id="highlights-panel"
        class="highlights-panel"
        role="tabpanel"
        aria-labelledby="highlights-tab"
      >
        <insights-reel></insights-reel>
      </div>
    `;
  }

  private renderChat() {
    return html`
      <div
        id="chat-panel"
        class="chat-panel"
        role="tabpanel"
        aria-labelledby="chat-tab"
      >
        <chat-component></chat-component>
      </div>
    `;
  }

  private renderHistory() {
    return html`
      <header-component></header-component>
      <div
        id="history-panel"
        class="history-panel"
        role="tabpanel"
        aria-labelledby="history-tab"
      >
        <history-component></history-component>
      </div>
    `;
  }

  private renderProjectManager() {
    return html`
      <header-component></header-component>
      <div
        id="projects-panel"
        class="projects-panel"
        role="tabpanel"
        aria-labelledby="projects-tab"
      >
        <project-manager-component></project-manager-component>
      </div>
    `;
  }

  private renderSettings() {
    return html`
      <header-component></header-component>
      <div
        id="settings-panel"
        class="settings-panel"
        role="tabpanel"
        aria-labelledby="settings-tab"
      >
        <settings-component></settings-component>
      </div>
    `;
  }

  private renderContent() {
    if (this.routerService.activePage === Pages.CHAT) {
      return this.renderChat();
    }
    if (this.routerService.activePage === Pages.NOTES) {
      return this.renderNotes();
    }
    if (this.routerService.activePage === Pages.SETTINGS) {
      return this.renderSettings();
    }
    if (this.routerService.activePage === Pages.NOTES_TAG_SELECTED) {
      const params = this.routerService.getActiveRouteParams();
      const id = params["id"] as string | undefined;
      return this.renderNotes(id ?? "");
    }
    if (this.routerService.activePage === Pages.HIGHLIGHTS) {
      return this.renderHighlights();
    }
    if (this.routerService.activePage === Pages.HISTORY) {
      return this.renderHistory();
    }
    if (this.routerService.activePage === Pages.PROJECTS) {
      return this.renderProjectManager();
    }
    if (this.routerService.activePage === Pages.HOME) {
      return this.renderHome();
    }
    return nothing;
  }

  override render() {
    return html`
      <sidenav-component></sidenav-component>
      <tabnav-component></tabnav-component>
      <div class="content">
        ${this.renderContent()}
        <project-dialog></project-dialog>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "project-component": Project;
  }
}
