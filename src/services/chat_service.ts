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

import { computed, observable, makeObservable } from "mobx";
import { Author, ChatMessage, Id } from "../shared/types";
import { generateNewId } from "../shared/utils";
import { CHAT_SCROLL_KEY, ScrollService } from "./scroll_service";
import { Service } from "./service";
import { StorageService } from "./storage_service";

interface ServiceProvider {
  storageService: StorageService;
  scrollService: ScrollService;
}

export class ChatService extends Service {
  constructor(private readonly sp: ServiceProvider) {
    super();
    makeObservable(this);
  }

  @observable private chatHistory: ChatMessage[] = [];

  private save() {
    this.sp.storageService.saveChat();
  }

  @computed
  get chats() {
    return this.chatHistory;
  }

  setChat(chats: ChatMessage[]) {
    this.chatHistory = chats;
  }

  addChatMessage(
    body: string,
    author: Author,
    noteIds?: Id[],
    createdNoteId?: Id
  ) {
    const chatId = generateNewId();
    this.chatHistory = [
      ...this.chatHistory,
      {
        id: chatId,
        author,
        body,
        dateCreated: new Date(),
        referencedNoteIds: noteIds,
        createdNoteId,
      },
    ];

    this.save();

    this.sp.scrollService.scrollElementToBottom(CHAT_SCROLL_KEY);
  }

  addCreateNoteId(chatId: Id, noteId: Id) {
    const chat = this.chatHistory.find((chat) => chat.id === chatId);
    if (chat) {
      chat.createdNoteId = noteId;
    }
  }

  /** Removes exchanges past (and including) given chat ID. */
  removeExchanges(chatId: string) {
    const index = this.chatHistory.findIndex((chat) => chat.id === chatId);
    this.chatHistory = this.chatHistory.slice(0, Math.max(0, index));
    this.save();
  }

  clearHistory() {
    this.chatHistory = [];
    this.save();
  }
}
