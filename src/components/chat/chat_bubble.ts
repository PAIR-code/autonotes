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
import "../../pair-components/textarea";
import "../../pair-components/tooltip";

import { observable } from "mobx";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";

import { type ChatMessage } from "../../shared/types";
import { convertMarkdownToHTML } from "../../shared/utils";
import { Synthesizer } from "../../helpers/synthesizer";
import { styles } from "./chat_bubble.scss";

/** App info view component */
@customElement("chat-bubble")
export class Chat extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly synthesizer: Synthesizer = null;

  @property() chatMessage: ChatMessage = {
    id: "",
    author: "system",
    body: "",
    dateCreated: new Date(),
    referencedNoteIds: [],
  };

  @property({ type: Object }) onUndo: () => Promise<string> = async () => {
    return "";
  };
  @property({ type: Object }) onAddNote: () => Promise<string> = async () => {
    return "";
  };
  @property({ type: Object }) onSeeReferencedNoteClick: () => void = () => {};
  @property({ type: Object }) onSeeCreatedNoteClick: () => void = () => {};

  @property({ type: Boolean }) isHovered = false;
  @state() private isPressed = false;

  @observable private isLoading = false;

  constructor() {
    super();
    this.synthesizer = new Synthesizer(() => {});
  }

  private toggleSpeechSynthesis() {
    if (this.synthesizer.isSpeaking) {
      this.synthesizer.stopSpeaking();
    } else {
      this.synthesizer.setUtterance(this.chatMessage.body);
      this.synthesizer.startSpeaking();
    }
  }

  private renderSpeakerButton() {
    if (this.chatMessage.author === "user") {
      return nothing;
    }

    const getIcon = () => {
      return this.synthesizer.isSpeaking ? "stop" : "volume_up";
    };

    return html`
      <pr-icon-button
        color="primary"
        icon=${getIcon()}
        size="small"
        padding="small"
        variant="filled"
        @click=${this.toggleSpeechSynthesis}
      ></pr-icon-button>
    `;
  }

  private renderBubbleBody() {
    const chatBubbleClasses = classMap({
      "chat-bubble": true,
      model: this.chatMessage.author === "system",
      pressed: this.isPressed,
    });

    return html`
      <div class=${chatBubbleClasses}>
        <div class="chat-body">
          ${unsafeHTML(
            convertMarkdownToHTML(
              this.chatMessage.body,
              /* sanitize html */ true
            )
          )}
        </div>
        ${this.renderSeeReferencedNotes()}
      </div>
    `;
  }

  private renderSeeReferencedNotes() {
    if (
      !this.chatMessage.referencedNoteIds ||
      this.chatMessage.referencedNoteIds.length === 0 ||
      this.chatMessage.referencedNoteIds[0] === ""
    ) {
      return nothing;
    }

    return html`
      <div @click=${this.onSeeReferencedNoteClick} class="referenced-notes">
        ${this.chatMessage.referencedNoteIds.length > 1
          ? "See referenced notes"
          : this.chatMessage.referencedNoteIds.length === 1
          ? "See referenced note"
          : nothing}
      </div>
    `;
  }

  private renderActionBar() {
    const wrapperClasses = classMap({
      "action-bar--wrapper": true,
      model: this.chatMessage.author === "system",
    });

    const actionBarClasses = classMap({
      "action-bar": true,
      hover: this.isHovered,
    });

    return html`
      <div class=${wrapperClasses}>
        <div class=${actionBarClasses}>
          ${this.renderSpeakerButton()} ${this.renderAddButton()}
          ${this.renderCreatedNoteLink()} ${this.renderUndoButton()}
        </div>
      </div>
    `;
  }

  private renderUndoButton() {
    if (this.chatMessage.author === "system" || this.chatMessage.id === "") {
      return nothing;
    }

    const handleUndoClick = async () => {
      await this.onUndo();
    };

    return html`
      <pr-tooltip text="Undo" position="LEFT" color="primary">
        <pr-icon-button
          color="primary"
          icon="undo"
          size="small"
          padding="small"
          variant="tonal"
          @click=${handleUndoClick}
        ></pr-icon-button>
      </pr-tooltip>
    `;
  }

  private renderAddButton() {
    if (
      this.chatMessage.author !== "system" ||
      this.chatMessage.createdNoteId
    ) {
      return nothing;
    }

    const handleAddNoteClick = async () => {
      this.isLoading = true;
      this.requestUpdate();

      await this.onAddNote();

      this.isLoading = false;
      this.requestUpdate();
    };

    return html`
      <pr-tooltip
        text="Save response as note"
        color="tertiary"
        variant="outlined"
        position="RIGHT"
      >
        <pr-icon-button
          color="tertiary"
          size="small"
          padding="small"
          variant="outlined"
          .loading=${this.isLoading}
          @click=${handleAddNoteClick}
          icon="add_notes"
        ></pr-icon-button>
      </pr-tooltip>
    `;
  }

  private renderCreatedNoteLink() {
    if (!this.chatMessage.createdNoteId) return nothing;

    return html`
      <pr-tooltip
        text="Go to created note"
        color="tertiary"
        variant="outlined"
        position="RIGHT"
      >
        <pr-icon-button
          color="tertiary"
          size="small"
          padding="small"
          @click=${this.onSeeCreatedNoteClick}
          icon="exit_to_app"
        ></pr-icon-button>
      </pr-tooltip>
    `;
  }

  override render() {
    const handleMouseEnter = () => {
      this.isHovered = true;
    };

    const handleMouseLeave = () => {
      this.isHovered = false;
    };

    const handleMouseDown = () => {
      this.isPressed = true;
    };

    const handleMouseUp = () => {
      window.setTimeout(() => {
        this.isPressed = false;
      }, 1000);
    };

    return html`
      <div
        class="bubble"
        @mouseenter=${handleMouseEnter}
        @mouseleave=${handleMouseLeave}
        @mousedown=${handleMouseDown}
        @mouseup=${handleMouseUp}
      >
        ${this.renderBubbleBody()} ${this.renderActionBar()}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "chat-bubble": Chat;
  }
}
