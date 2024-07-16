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
import "../../pair-components/icon_button";
import "../note/note";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { Ref, createRef, ref } from "lit/directives/ref.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { reaction } from "mobx";

import { Note } from "../../shared/types";
import { convertMarkdownToHTML, removeLeadingHash } from "../../shared/utils";

import { core } from "../../core/core";
import { LlmService } from "../../services/llm_service";
import { NotebookService } from "../../services/notebook_service";
import { RouterService } from "../../services/router_service";
import { NOTES_SCROLL_KEY, ScrollService } from "../../services/scroll_service";

import { styles } from "./notebook.scss";
import { SettingsService } from "../../services/settings_service";

const MAX_RECENT_TAGS = 7;

/** App info view component */
@customElement("notebook-component")
export class Notebook extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  @property() tag = "";

  private readonly llmService = core.getService(LlmService);
  private readonly notebookService = core.getService(NotebookService);
  private readonly routerService = core.getService(RouterService);
  private readonly scrollService = core.getService(ScrollService);
  private readonly settingsService = core.getService(SettingsService);

  private readonly notesScrollRef: Ref<HTMLElement> = createRef();

  override async firstUpdated() {
    window.setTimeout(() => {
      this.scrollService.registerScrollElement(
        NOTES_SCROLL_KEY,
        this.notesScrollRef
      );
      this.scrollService.scrollElementToBottom(NOTES_SCROLL_KEY);
    }, 200);

    reaction(
      () => this.notebookService.selectedTag,
      () => {
        this.checkUpdateTagSummary();
      }
    );
  }

  private async checkUpdateTagSummary(forceUpdate = false) {
    const { selectedTag } = this.notebookService;
    if (
      this.settingsService.hasApiKey &&
      selectedTag &&
      selectedTag !== "" &&
      (!this.notebookService.getTagSummary(selectedTag) || forceUpdate)
    ) {
      await this.llmService.updateTagSummary(selectedTag);
      this.requestUpdate();
    }
  }

  private renderNote(note: Note) {
    return html`<note-component .note=${note}></note-component>`;
  }

  private renderNewNote() {
    return html`<note-component layout="edit-flex"></note-component>`;
  }

  private renderSummary() {
    if (this.tag === "") {
      return nothing;
    }

    if (!this.notebookService.tagSummary) {
      if (!this.settingsService.hasApiKey) {
        const onSettingsClick = () => {
          this.routerService.navigateToSettingsPage();
        }

        return html`
          <div class="summary">
            <i>
              To generate summaries, add an API key in
              <u @click=${onSettingsClick}>Settings</u>.
            </i>
          </div>
        `;
      }

      return html`<div class="summary"><i>🪄 Generating summary...</i></div>`;
    }

    return html`
      <div
        class="summary"
        title="Double click to re-generate summary"
        @dblclick=${() => {
          this.checkUpdateTagSummary(true);
        }}
      >
        ${unsafeHTML(
          convertMarkdownToHTML(
            this.notebookService.tagSummary,
            /* sanitize html */ true
          )
        )}
      </div>
    `;
  }

  private renderRelatedTags() {
    if (!this.notebookService.relatedTags.length) {
      return nothing;
    }

    const renderTag = (tagName: string) => {
      const count = this.notebookService.getTagCount(tagName);
      return html`
        <span
          class="tag"
          @click=${() => {
            this.routerService.navigateToNotesPage(removeLeadingHash(tagName));
          }}
          >${tagName} (${count})</span
        >
      `;
    };

    return html`
      <div class="related-tags">
        <h2>Subtags</h2>
        <div class="related-tags-zone">
          ${this.notebookService.relatedTags.map(renderTag)}
        </div>
      </div>
    `;
  }

  private renderTagPageInfo() {
    if (this.tag === "") {
      return nothing;
    }

    return html`
      <div class="top-info">
        ${this.renderSummary()} ${this.renderRelatedTags()}
      </div>
    `;
  }

  override render() {
    const renderEmptyMessage = () => {
      if (this.notebookService.displayedNotes.length === 0) {
        return html`<p class="empty">No notes found.</p>`;
      }
      return nothing;
    };

    return html`
      <div class="notes" ${ref(this.notesScrollRef)}>
        ${this.renderTagPageInfo()} ${renderEmptyMessage()}
        ${this.notebookService.displayedNotes.map((note) =>
          this.renderNote(note)
        )}
      </div>
      ${this.renderNewNote()}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "notebook-component": Notebook;
  }
}
