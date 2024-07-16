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
import "./chat_bubble";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { Ref, createRef, ref } from "lit/directives/ref.js";
import { observable } from "mobx";

import { core } from "../../core/core";
import { ChatService } from "../../services/chat_service";
import { LlmService } from "../../services/llm_service";
import { NotebookService } from "../../services/notebook_service";
import { SettingsService } from "../../services/settings_service";
import { RouterService } from "../../services/router_service";
import { CHAT_SCROLL_KEY, ScrollService } from "../../services/scroll_service";
import { Transcriber } from "../../helpers/transcriber";

import { type ChatMessage } from "../../shared/types";
import { TEXT_ENABLE_API_KEY } from "../../shared/constants";
import { formatDate, extractTagsFromText } from "../../shared/utils";

import { styles } from "./chat.scss";

/** App info view component */
@customElement("chat-component")
export class Chat extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  @property() value = "";
  @property() modelOutput = "";

  @observable private isRunning = false;

  private readonly chatService = core.getService(ChatService);
  private readonly llmService = core.getService(LlmService);
  private readonly scrollService = core.getService(ScrollService);
  private readonly routerService = core.getService(RouterService);
  private readonly notebookService = core.getService(NotebookService);
  private readonly settingsService = core.getService(SettingsService);
  private readonly transcriber: Transcriber = null;

  private readonly chatScrollRef: Ref<HTMLElement> = createRef();

  @state() speechInterimResult = "";

  constructor() {
    super();
    this.transcriber = new Transcriber(
      (text, isFinal) => this.handleSpeechResult(text, isFinal),
      () => {
        if (this.value) {
          this.runModel();
        }
      },
      /*continuous*/ false
    );
  }

  override firstUpdated() {
    // Hack to re-render after chats are loaded from indexed db.
    window.setTimeout(() => {
      this.requestUpdate();
    }, 100);

    window.setTimeout(() => {
      this.scrollService.registerScrollElement(
        CHAT_SCROLL_KEY,
        this.chatScrollRef
      );
      this.scrollService.scrollElementToBottom(CHAT_SCROLL_KEY);
    }, 200);
  }

  private clearInputValue() {
    this.value = "";
  }

  private renderChatBubble(chatMessage: ChatMessage) {
    const onAddNote = async () => {
      const noteId = await this.llmService.createNoteFromChat(chatMessage.body);

      this.chatService.addCreateNoteId(chatMessage.id, noteId);

      return noteId;
    };

    const onUndo = async () => {
      this.chatService.removeExchanges(chatMessage.id);
      this.requestUpdate();
    };

    const onSeeReferencedNoteClick = () => {
      this.notebookService.setIdsToDisplay(chatMessage.referencedNoteIds || []);
      this.routerService.navigateToNotesPage(
        "",
        chatMessage.referencedNoteIds || []
      );
    };

    const onSeeCreatedNoteClick = () => {
      if (chatMessage.createdNoteId) {
        this.routerService.navigateToNotesPage("", [chatMessage.createdNoteId]);
      }
    };

    return html`
      <div class="bubble-container">
        ${this.renderTimeStamp(chatMessage)}
        <chat-bubble
          .chatMessage=${chatMessage}
          .onUndo=${onUndo.bind(this)}
          .onAddNote=${onAddNote.bind(this)}
          .onSeeReferencedNoteClick=${onSeeReferencedNoteClick.bind(this)}
          .onSeeCreatedNoteClick=${onSeeCreatedNoteClick.bind(this)}
        >
        </chat-bubble>
      </div>
    `;
  }

  private renderTimeStamp(chatMessage: ChatMessage) {
    if (chatMessage.author !== "user") {
      return nothing;
    }
    const date = new Date(chatMessage.dateCreated);
    return html`<span class="date">${formatDate(date)}</span>`;
  }

  private renderChatHistory() {
    return html`
      <div class="chat-scroll" ${ref(this.chatScrollRef)}>
        <div class="chat-history">
          ${this.chatService.chats.map(this.renderChatBubble.bind(this))}
        </div>
      </div>
    `;
  }

  private addResetUserInput() {
    this.chatService.addChatMessage(this.value, "user");
    this.clearInputValue();
  }

  private async addNoteToSelf() {
    const noteBody = this.value.substring("@note ".length, this.value.length);

    this.addResetUserInput();

    this.isRunning = true;
    const noteId = await this.llmService.createNoteFromChat(noteBody);
    this.isRunning = false;

    const note = this.notebookService.getNote(noteId)!;
    const systemMessage = `>${noteBody}

📝  Note created with tags: ${note.tags.join(", ")}`;

    this.chatService.addChatMessage(systemMessage, "system", [], noteId);
    this.requestUpdate();
  }

  private async runModel() {
    this.addResetUserInput();

    this.isRunning = true;
    await this.llmService.runChatWithContextRelevantNotes();
    this.isRunning = false;

    this.requestUpdate();
  }

  private renderInput() {
    const sendUserInput = () => {
      // Turn off transcriber
      this.transcriber.stopListening();

      if (this.value.startsWith("@note ")) {
        this.addNoteToSelf();
      } else {
        this.runModel();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        sendUserInput();
        e.stopPropagation();
      }
    };

    const handleInput = (e: Event) => {
      this.value = (e.target as HTMLTextAreaElement).value;
    };

    const autoFocus = () => {
      // Only auto-focus chat input if on desktop
      return navigator.maxTouchPoints === 0;
    };

    const disableSendButton = () => {
      // Disable send if chat is empty OR if there is a transcript in progress*
      //
      // *This is different than checking whether isListening is true
      // because the microphone can be on in betweeen user transcriptions
      return (
        this.value === "" ||
        this.speechInterimResult !== "" ||
        !this.settingsService.hasApiKey
      );
    };

    const onSettingsClick = () => {
      this.routerService.navigateToSettingsPage();
    };

    const renderApiKeyWarning = () => {
      if (this.settingsService.hasApiKey) {
        return nothing;
      }

      return html`
        <div class="error-banner">
          To chat with Gemini, add an AI Studio API key in
          <u @click=${onSettingsClick}>Settings</u>.
        </div>
      `;
    };

    const tooltipText = !this.settingsService.hasApiKey ?
      TEXT_ENABLE_API_KEY : "";

    return html`
      <div class="input-wrapper">
        ${renderApiKeyWarning()}
        <div class="input">
          ${this.renderTranscribeButton()}
          <pr-textarea
            size="small"
            placeholder="Talk to AutoNotes"
            .value=${this.value + this.speechInterimResult}
            .disabled=${this.isRunning || !this.settingsService.hasApiKey}
            autofocus
            ?focused=${autoFocus()}
            @keydown=${handleKeyDown}
            @input=${handleInput}
          >
          </pr-textarea>
          <pr-tooltip
            text=${tooltipText}
            color="tertiary"
            variant="outlined"
            position="TOP_END"
          >
            <pr-icon-button
              icon="send"
              variant="tonal"
              .disabled=${disableSendButton()}
              @click=${sendUserInput}
              .loading=${this.isRunning}
            >
            </pr-icon-button>
          </pr-tooltip>
        </div>
      </div>
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

    const disabled = !this.settingsService.apiKey;
    const tooltipText = disabled ? TEXT_ENABLE_API_KEY : "";

    return html`
      <pr-tooltip
        text=${tooltipText}
        color="tertiary"
        variant="outlined"
        position="TOP_START"
      >
        <pr-icon-button
          icon=${getMicIcon()}
          color="secondary"
          size="small"
          padding="small"
          variant="default"
          ?disabled=${disabled}
          @click=${toggleTranscriptionService}
        >
        </pr-icon-button>
      </pr-tooltip>
    `;
  }

  private handleSpeechResult(text: string, isFinal: boolean) {
    if (isFinal) {
      this.value += this.speechInterimResult;
      this.speechInterimResult = "";
    } else {
      this.speechInterimResult = " " + text;
    }
  }

  override render() {
    return html`
      <div class="chat">
        ${this.renderChatHistory()}
        <div class="input-row-wrapper">
          <div class="input-row">${this.renderInput()}</div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "chat-component": Chat;
  }
}
