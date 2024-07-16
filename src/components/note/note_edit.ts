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

import "../../pair-components/textarea";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";

import { makeBlankNote } from "../../shared/initial_data";
import { type Note } from "../../shared/types";

import { styles } from "./note_edit.scss";

/** Types of available note layouts. */
const NOTE_LAYOUTS = ["edit-full", "edit-flex"] as const;
type NoteLayout = (typeof NOTE_LAYOUTS)[number];

/** Editable note content. */
@customElement("note-edit")
export class NoteEdit extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  @property() note: Note = makeBlankNote();
  @property() speechInterimResult = "";
  @property() handleTitleInput: (titleText: string) => void = () => {};
  @property() handleBodyInput: (bodyText: string) => void = () => {};
  @property() layout: NoteLayout = "edit-full";
  @property() showTitle = true;
  @property() onKeyDown: (e: KeyboardEvent) => void = (e: KeyboardEvent) => {};

  private renderTitle() {
    if (!this.showTitle) {
      return nothing;
    }

    const handleTitleInput = (e: Event) => {
      this.handleTitleInput((e.target as HTMLTextAreaElement).value);
    };

    return html`
      <pr-textarea
        class="title-textarea"
        placeholder="Title"
        size="large"
        variant="default"
        .value=${this.note.title}
        @input=${handleTitleInput}
      >
      </pr-textarea>
    `;
  }

  private renderBody() {
    const handleInput = (e: Event) => {
      this.handleBodyInput((e.target as HTMLTextAreaElement).value);
    };

    const autoFocus = () => {
      // Only auto-focus if full note style OR edit-flex on desktop
      return (
        this.layout === "edit-full" ||
        (this.layout === "edit-flex" && navigator.maxTouchPoints === 0)
      );
    };

    return html`
      <pr-textarea
        placeholder="Take a note..."
        size="small"
        variant="default"
        maxViewportHeight=${this.layout === "edit-flex" ? 30 : 80}
        ?focused=${autoFocus()}
        .value=${this.note.markdown + this.speechInterimResult}
        @keydown=${this.onKeyDown}
        @focus=${() => {
          this.showTitle = true;
        }}
        @input=${handleInput}
      >
      </pr-textarea>
    `;
  }

  override render() {
    return html` ${this.renderTitle()} ${this.renderBody()} `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "note-edit": NoteEdit;
  }
}
