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

import "../../pair-components/icon_button";
import "./note_edit";
import "./note_preview";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { Ref, createRef, ref } from "lit/directives/ref.js";

import { makeBlankNote } from "../../shared/initial_data";
import { type Note } from "../../shared/types";
import { formatDate, removeLeadingHash } from "../../shared/utils";

import { core } from "../../core/core";
import { LlmService } from "../../services/llm_service";
import { NotebookService } from "../../services/notebook_service";
import { RouterService } from "../../services/router_service";
import { SettingsService } from "../../services/settings_service";
import { Transcriber } from "../../helpers/transcriber";
import { styles } from "./note.scss";

/** Types of available note layouts. */
const NOTE_LAYOUTS = ["preview", "edit-flex"] as const;
type NoteLayout = (typeof NOTE_LAYOUTS)[number];

const MAX_RECENT_TAGS = 8;

/** Note component */
@customElement("note-component")
export class NoteComponent extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly notebookService = core.getService(NotebookService);
  private readonly llmService = core.getService(LlmService);
  private readonly routerService = core.getService(RouterService);
  private readonly settingsService = core.getService(SettingsService);
  private readonly transcriber: Transcriber = null;

  @property() note: Note = makeBlankNote();
  @property() layout: NoteLayout = "preview";
  @state() showFullNote = false;
  @state() speechInterimResult = "";

  dateRef: Ref<Element> = createRef();

  constructor() {
    super();
    this.transcriber = new Transcriber(
      (text, isFinal) => this.handleSpeechResult(text, isFinal),
      () => {}
    );
  }

  private renderTags() {
    return html`
      <div class="tags">
        ${this.note.tags.slice(0, MAX_RECENT_TAGS).map((tag) => {
          const handleClick = () => {
            console.log("handleClick");
            this.routerService.navigateToNotesPage(removeLeadingHash(tag));
          };
          return html`<div class="tag" @click=${handleClick}>${tag}</div>`;
        })}
      </div>
    `;
  }

  private renderNoteContent() {
    const showTitleInEditMode = () => {
      return this.layout === "edit-flex" && !this.showFullNote;
    };

    const handleBodyInput = (bodyValue: string) => {
      this.note = { ...this.note, markdown: bodyValue };
    };

    const handleTitleInput = (titleValue: string) => {
      this.note = { ...this.note, title: titleValue };
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === "Enter") {
        this.handleSaveClick();
      } else if (e.key === "Escape") {
        this.showFullNote = false;

        if (this.isUnsavedNote()) {
          this.note = makeBlankNote();
        }

        if (document.activeElement) {
          (document.activeElement as any).blur();
        }
      }
    };

    if (this.showFullNote || this.layout === "edit-flex") {
      const editLayout = this.showFullNote ? "edit-full" : "edit-flex";
      return html`
        <div class="note-content-wrapper">
          <note-edit
            .note=${this.note}
            .speechInterimResult=${this.speechInterimResult}
            .layout=${editLayout}
            .showTitle=${showTitleInEditMode()}
            .handleTitleInput=${handleTitleInput}
            .handleBodyInput=${handleBodyInput}
            .onKeyDown=${onKeyDown}
          ></note-edit>
        </div>
      `;
    }
    const date = new Date(this.note.dateCreated);
    return html`
      <div class="note-content-wrapper">
        <div class="header-row">
          <span class="date">${formatDate(date)}</span>
          ${this.renderDateEditor()}
        </div>
        <note-preview .note=${this.note}></note-preview>
        <div class="footer-row">${this.renderTags()}</div>
      </div>
    `;
  }

  private renderDateEditor() {
    if (!this.settingsService.showDateEditor) {
      return nothing;
    }

    const saveDateInput = (e: Event) => {
      const newDate = new Date((e.target as HTMLInputElement).value);
      this.notebookService.updateNoteDateCreated(this.note.id, newDate);
      this.notebookService.updateNoteDateModified(this.note.id, newDate);
    };

    return html`
      <input type="date" ${ref(this.dateRef)} @change=${saveDateInput} />
    `;
  }

  private renderNotePreviewOverflow() {
    if (this.layout !== "preview" || this.showFullNote) {
      return nothing;
    }

    return html`
      <div class="note-preview-overflow-wrapper">
        <pr-icon-button
          icon="close"
          size="small"
          padding="small"
          color="neutral"
          variant="default"
          @click=${() => {
            this.notebookService.deleteNote(this.note.id);
          }}
        >
        </pr-icon-button>
      </div>
    `;
  }

  private renderNoteEditActions() {
    if (this.layout === "preview" && !this.showFullNote) {
      return nothing;
    }

    return html`
      <div class="note-edit-actions-wrapper">
        ${this.renderExpandButton()}
        <div class="bottom">
          ${this.renderTranscribeButton()} ${this.renderSaveButton()}
        </div>
      </div>
    `;
  }

  private renderExpandButton() {
    const getExpandIcon = () => {
      return this.showFullNote ? "close_fullscreen" : "open_in_full";
    };

    return html`
      <pr-icon-button
        icon=${getExpandIcon()}
        color="neutral"
        size="small"
        padding="small"
        variant="default"
        @click=${() => {
          this.showFullNote = !this.showFullNote;

          // If not a new note, save the note on close
          if (this.layout !== "edit-flex") {
            this.handleSaveClick();
          }
        }}
      >
      </pr-icon-button>
    `;
  }

  private renderSaveButton() {
    const isDisabled = () => {
      // Disable save if note is empty OR if there is a transcript in progress*
      //
      // *This is different than checking whether isListening is true
      // because the microphone can be on in betweeen user transcriptions
      return (
        (this.note.markdown === "" && this.note.title === "") ||
        this.speechInterimResult !== ""
      );
    };

    return html`
      <pr-icon-button
        class="save-button"
        icon="done"
        size="small"
        padding="small"
        variant="tonal"
        ?disabled=${isDisabled()}
        @click=${this.handleSaveClick}
      >
      </pr-icon-button>
    `;
  }

  private renderTranscribeButton() {
    const getMicIcon = () => {
      return this.transcriber.isListening ? "stop" : "mic";
    };

    const toggleTranscriptionService = () => {
      if (this.transcriber.isListening) {
        this.transcriber.stopListening();
      } else {
        this.transcriber.startListening();
      }
    };

    return html`
      <pr-icon-button
        icon=${getMicIcon()}
        color="secondary"
        size="small"
        padding="small"
        variant="default"
        @click=${toggleTranscriptionService}
      >
      </pr-icon-button>
    `;
  }

  private handleSpeechResult(text: string, isFinal: boolean) {
    if (isFinal) {
      const currentText = this.note.markdown + this.speechInterimResult;
      this.speechInterimResult = "";
      this.note = { ...this.note, markdown: currentText };
    } else {
      this.speechInterimResult = " " + text;
    }
  }

  private isUnsavedNote() {
    return this.note.id === "";
  }

  private handleSaveClick() {
    // Turn off transcriber
    this.transcriber.stopListening();

    // Only save non-empty notes
    if (this.note.markdown === "" && this.note.title === "") {
      return;
    }

    if (this.isUnsavedNote()) {
      // If we're on a selected tag page, add the tag to the note body.
      const tag = this.notebookService.selectedTag;
      let noteWithTag = this.note.markdown;
      if (tag && !this.note.markdown.includes(tag)) {
        noteWithTag += `#${tag}`;
      }
      if (this.settingsService.hasApiKey) {
        // Add current unsaved note to notebook
        this.llmService.addNoteWithGeneratedTags(noteWithTag, this.note.title);
      } else {
        this.notebookService.addNote(noteWithTag, "user", this.note.title);
      }

      // Clear the note only if the layout is edit-flex
      // (right now this type of note is the new note)
      if (this.layout === "edit-flex") {
        this.note = makeBlankNote();
      }
    } else {
      this.notebookService.updateNoteTitle(this.note.id, this.note.title);
      this.notebookService.updateNoteBody(this.note.id, this.note.markdown);

      // Sync current note object with updated values, e.g., body, previews
      this.note = this.notebookService.getNote(this.note.id);
    }

    this.showFullNote = false;
  }

  override render() {
    const classes = classMap({
      "note-wrapper": true,
      "edit-flex": this.layout === "edit-flex",
      "edit-full": this.showFullNote,
    });

    return html`
      <div
        class=${classes}
        @mouseup=${() => {
          this.showFullNote = false;
          // If not a new note, save on close
          if (this.layout !== "edit-flex") {
            this.handleSaveClick();
          }
        }}
      >
        <div class="note-inner-wrapper">
          <div
            class="note"
            @mouseup=${(event: Event) => {
              event.stopPropagation();
            }}
            @dblclick=${(event: Event) => {
              // Don't open on double click for editable notes.
              if (this.layout === "edit-flex") return;
              event.stopPropagation();
              this.showFullNote = true;
            }}
          >
            ${this.renderNoteContent()} ${this.renderNotePreviewOverflow()}
            ${this.renderNoteEditActions()}
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "note-component": NoteComponent;
  }
}
