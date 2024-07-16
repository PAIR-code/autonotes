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

import {
  makeChatPromptFromRelevantNotes,
  makeRelevantNotesPrompt,
  makeRelevantTagsPrompt,
  makeTagSummaryPrompt,
  makeTagsFromContentPrompt,
  makeTitleFromContentPrompt,
  processRelevantNotesResponse,
  processRelevantTagsResponse,
  processTagSummaryResponse,
  processTagsFromContentResponse,
} from "../shared/prompts";
import { ChatMessage, Id, Note, Tag } from "../shared/types";
import { extractTagsFromText } from "../shared/utils";
import { ApiService } from "./api_service";
import { ChatService } from "./chat_service";
import { NotebookService } from "./notebook_service";
import { PromptHistoryService } from "./prompt_history_service";
import { Service } from "./service";

interface ServiceProvider {
  notebookService: NotebookService;
  apiService: ApiService;
  chatService: ChatService;
  promptHistoryService: PromptHistoryService;
}

const UNSURE_RESPONSE_TEXT = `Sorry, I'm not sure how to answer that.`;

/**
 * LLM service
 *
 * Handles LLM interactions, calling LLM + updating NotebookService.
 */
export class LlmService extends Service {
  constructor(private readonly sp: ServiceProvider) {
    super();
  }

  async createNoteFromChat(chatBody: string) {
    // If the chat body already has some tags, don't generate more
    const initialTags = extractTagsFromText(chatBody).tags;
    if (initialTags.length > 0) {
      return this.sp.notebookService.addNote(chatBody, "system");
    }

    let title: string | undefined = undefined;
    if (chatBody.length > 40) {
      const { prompt: titlePrompt, stopToken: titleStopToken } =
        makeTitleFromContentPrompt(chatBody);
      const titleResponse = await this.sp.apiService.callPredict(titlePrompt, [
        titleStopToken,
      ]);
      title = titleResponse.text;

      this.sp.promptHistoryService.logPromptCall(
        titlePrompt,
        titleResponse.text,
        titleResponse.text,
        [titleStopToken],
        "title from content - create note from chat"
      );
    }

    const { prompt, stopToken } = makeTagsFromContentPrompt(
      chatBody,
      this.sp.notebookService.tags
    );

    const response = await this.sp.apiService.callPredict(prompt, [stopToken]);

    const createdTags = processTagsFromContentResponse(response.text);

    this.sp.promptHistoryService.logPromptCall(
      prompt,
      response.text,
      createdTags,
      [stopToken],
      "tags from content - create note from chat"
    );

    const newNoteBody = chatBody + "\n" + createdTags.join(" ");
    return this.sp.notebookService.addNote(newNoteBody, "system", title);
  }

  async updateTagSummary(tag: Tag) {
    this.sp.notebookService.setTagSummary(tag, "");

    const notes = this.sp.notebookService
      .getNoteIdsWithTag(`#${tag}`)
      .concat(this.sp.notebookService.getNoteIdsWithCategory(`#${tag}`))
      .map((id) => this.sp.notebookService.getNote(id)) as Note[];

    const { prompt, stopToken } = makeTagSummaryPrompt(notes, tag);

    const response = await this.sp.apiService.callPredict(prompt, [stopToken]);

    const tagSummary = processTagSummaryResponse(response.text);

    this.sp.promptHistoryService.logPromptCall(
      prompt,
      response.text,
      tagSummary,
      [stopToken],
      "tag summary - get tag summary"
    );

    this.sp.notebookService.setTagSummary(tag, tagSummary);
  }

  async addTagsToNote(noteId: string) {
    const note = this.sp.notebookService.getNote(noteId);

    const { prompt, stopToken } = makeTagsFromContentPrompt(
      note.markdown,
      this.sp.notebookService.tags,
      note.title
    );

    const response = await this.sp.apiService.callPredict(prompt, [stopToken]);

    const generatedTags = processTagsFromContentResponse(response.text);
    this.sp.notebookService.addTagsToNotes(note.id, generatedTags);
  }

  async addNoteWithGeneratedTags(noteBody: string, noteTitle: string) {
    const existingTags = extractTagsFromText(noteBody).tags;
    if (existingTags.length === 0) {
      const { prompt, stopToken } = makeTagsFromContentPrompt(
        noteBody,
        this.sp.notebookService.tags,
        noteTitle
      );

      const response = await this.sp.apiService.callPredict(prompt, [
        stopToken,
      ]);

      const generatedTags = processTagsFromContentResponse(response.text);

      this.sp.promptHistoryService.logPromptCall(
        prompt,
        response.text,
        generatedTags,
        [stopToken],
        "tags from content - add note with generated tags"
      );

      noteBody = noteBody + "\n" + generatedTags.join(" ");
    }

    this.sp.notebookService.addNote(noteBody, "user", noteTitle);
  }

  async runChatWithContextRelevantNotes() {
    const chats = this.sp.chatService.chats;
    const notes = this.sp.notebookService.notes;

    const { prompt, stopToken } = makeRelevantNotesPrompt(chats, notes);

    const chatNotesResponse = await this.sp.apiService.callPredict(prompt, [
      stopToken,
    ]);

    const processedNotesIds = processRelevantNotesResponse(
      chatNotesResponse.text
    );

    this.sp.promptHistoryService.logPromptCall(
      prompt,
      chatNotesResponse.text,
      processedNotesIds,
      [stopToken],
      "notes - get relevant notes for chat prompt"
    );

    // process NoteIds to Relevant Notes.
    const noteTexts: string[] = [];
    for (const noteId of processedNotesIds) {
      const note = this.sp.notebookService.getNote(noteId);
      if (note) {
        noteTexts.push(`${note.markdown}`);
      }
    }

    const tagSummaries = this.sp.notebookService.tagSummaryMap;
    const { chatPrompt, chatStopToken } = makeChatPromptFromRelevantNotes(
      chats,
      noteTexts,
      tagSummaries
    );
    const chatResponse = await this.sp.apiService.callPredict(chatPrompt, [
      chatStopToken,
    ]);

    this.sp.promptHistoryService.logPromptCall(
      chatPrompt,
      chatResponse.text,
      chatResponse.text,
      [chatStopToken],
      "chat - chat with relevant notes"
    );

    const responseMessage = chatResponse.text
      ? chatResponse.text
      : UNSURE_RESPONSE_TEXT;
    this.sp.chatService.addChatMessage(
      responseMessage,
      "system",
      processedNotesIds
    );
  }

  /** Generic Prompt call */
  async runPrompt(prompt: string, stopTokens: string[] = []) {
    const chats = this.sp.chatService.chats;
    const notes = this.sp.notebookService.notes;

    const response = await this.sp.apiService.callPredict(prompt, stopTokens);

    // (If forking, add any follow-up actions here, e.g., updating tags)
    return response.text;
  }
}
