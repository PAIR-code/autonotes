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

import * as sanitizeHtml from "sanitize-html";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";

import { makeBlankNote } from "../../shared/initial_data";
import {
  type Note,
  ContentBlock,
  ListBlock,
  ListItem,
  TextBlock,
} from "../../shared/types";
import { extractTagsFromText } from "../../shared/utils";

import { styles } from "./note_preview.scss";

/** Preview of note content. */
@customElement("note-preview")
export class NotePreview extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  @property() note: Note = makeBlankNote();

  override render() {
    const renderTitle = () => {
      if (this.note.title !== "") {
        return html`<div class="title">${this.note.title}</div>`;
      }
      return nothing;
    };

    return html`
      ${renderTitle()}
      <div class="body">${this.renderContentBlocks(this.note.body)}</div>
    `;
  }

  private renderContentBlocks(blocks: ContentBlock[]) {
    return html`
      ${blocks.map((block) => {
        if (block.type === "text") {
          return this.renderTextBlock(block);
        } else {
          return this.renderListBlock(block);
        }
      })}
    `;
  }

  private renderTextBlock(block: TextBlock) {
    const cleanHTML = sanitizeHtml(block.text);
    return html`${unsafeHTML(cleanHTML)}`;
  }

  private renderListBlock(block: ListBlock) {
    const handleCheckboxClick = () => {
      // NOTE: Eventually handle checkbox click
    };

    const renderListItem = (item: ListItem, index: number) => {
      return html`
        <div class="list-item">
          <input
            class="checkbox"
            type="checkbox"
            id=${index}
            name=${index}
            ?checked=${item.isChecked}
            disabled
            @click=${handleCheckboxClick}
          />
          <label for=${index}>${item.text}</label>
        </div>
      `;
    };

    return html`
      <div class="list-block">
        ${block.list.map((item: ListItem, index: number) => {
          return renderListItem(item, index);
        })}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "note-preview": NotePreview;
  }
}
