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
  ObservableMap,
  action,
  computed,
  makeObservable,
  observable,
} from "mobx";

import { TagHelper } from "../helpers/tag_helper";
import {
  Author,
  ContentBlock,
  Id,
  Note,
  TagSummaryItem,
  type Tag,
} from "../shared/types";
import {
  extractTagsFromText,
  generateNewId,
  getParsedNoteMarkdown,
  parseRawNoteContent,
  removeLeadingHash,
} from "../shared/utils";
import { RouterService } from "./router_service";
import { NOTES_SCROLL_KEY, ScrollService } from "./scroll_service";
import { Service } from "./service";
import { StorageService } from "./storage_service";

interface ServiceProvider {
  routerService: RouterService;
  storageService: StorageService;
  scrollService: ScrollService;
}

export class NotebookService extends Service {
  readonly notesMap = new ObservableMap<Id, Note>();
  readonly tagHelper = new TagHelper();

  constructor(private readonly sp: ServiceProvider) {
    super();
    makeObservable(this);
  }

  @observable
  selectedTag: Tag | undefined = undefined;

  @observable tagSummaryMap = new ObservableMap<Tag, string>();

  @computed get tagSummary() {
    if (!this.selectedTag) return "";

    const summary = this.tagSummaryMap.get(this.selectedTag);
    return summary || "";
  }

  // Used to set tag summaries when loading a notebook
  setTagSummaries(entries: TagSummaryItem[]) {
    this.tagSummaryMap.clear();
    entries.forEach((entry) => {
      this.tagSummaryMap.set(entry.tag, entry.summary);
    });
    this.save();
  }

  getTagSummariesList(): TagSummaryItem[] {
    return Array.from(this.tagSummaryMap.entries()).map((entry) => {
      const [tag, summary] = entry;
      return { tag, summary };
    });
  }

  getTagSummary(tag: Tag): string {
    return this.tagSummaryMap.get(tag) || "";
  }

  setTagSummary(tag: Tag, tagSummary: string) {
    this.tagSummaryMap.set(tag, tagSummary);
    this.save();
  }

  @observable
  idsToDisplay: Id[] = [];

  @computed get notes(): Note[] {
    return Array.from(this.notesMap.values());
  }

  @computed get displayedNotes(): Note[] {
    if (!this.selectedTag && this.idsToDisplay.length === 0) {
      return this.notes;
    }

    if (this.idsToDisplay.length) {
      return this.notes.filter((note: Note) =>
        this.idsToDisplay.includes(note.id)
      );
    }

    const tagsContainCategory = (tags: string[], category: string) => {
      for (const tag of tags) {
        if (
          removeLeadingHash(tag)
            .toLowerCase()
            .startsWith(removeLeadingHash(category).toLowerCase())
        ) {
          return true;
        }
      }
      return false;
    };

    return this.notes.filter((note: Note) =>
      tagsContainCategory(note.tags, this.selectedTag!)
    );
  }

  @computed get tags(): Tag[] {
    return this.tagHelper.tagsSortedByAlphabetical;
  }

  @computed get relatedTags(): Tag[] {
    if (!this.selectedTag) {
      return [];
    }

    return this.tags
      .filter((tag) =>
        removeLeadingHash(tag).startsWith(removeLeadingHash(this.selectedTag))
      )
      .sort((a, b) => {
        // Sort in descending order by count
        return this.getTagCount(a) < this.getTagCount(b) ? 1 : -1;
      });
  }

  @computed get categories(): Tag[] {
    return this.tagHelper.categoriesSortedByCount;
  }

  getTagCount(tag: Tag): number {
    const notes = this.tagHelper.getNoteIdsWithTag(tag);
    if (!notes) return 0;
    return notes.length;
  }

  getCategoryCount(category: Tag): number {
    const notes = this.tagHelper.getNoteIdsWithCategory(category);
    if (!notes) return 0;
    return notes.length;
  }

  setIdsToDisplay(ids: Id[]) {
    this.idsToDisplay = ids;
  }

  getNoteIdsWithTag(tag: Tag): Id[] {
    return this.tagHelper.getNoteIdsWithTag(tag);
  }

  getNoteIdsWithCategory(category: Tag): Id[] {
    return this.tagHelper.getNoteIdsWithCategory(category);
  }

  getTagsWithCategory(category: Tag): Tag[] {
    return this.tags.filter((tag) =>
      removeLeadingHash(tag.toLowerCase()).startsWith(
        removeLeadingHash(category.toLowerCase())
      )
    );
  }

  getNote(id: Id): Note | undefined {
    return this.notesMap.get(id);
  }

  private save() {
    this.sp.storageService.saveNotebook();
  }

  private scrollToBottom() {
    window.setTimeout(() => {
      this.sp.scrollService.scrollElementToBottom(NOTES_SCROLL_KEY);
    }, 300);
  }

  /**
   * Setting a new set of notes - this will update all maps containing
   * tag or note state.
   */
  @action
  setNotes(notes: Note[]) {
    this.notesMap.clear();
    for (const note of notes) {
      this.notesMap.set(note.id, note);
    }

    this.tagHelper.setNotes(notes);
  }

  @action
  clearNotes() {
    this.notesMap.clear();
    this.tagSummaryMap.clear();
    this.tagHelper.setNotes([]);
    this.save();
  }

  @action
  addTagsToNotes(noteId: string, tags: Tag[]) {
    const note = this.getNote(noteId);

    note.markdown += "\n" + tags.join(" ");

    note.tags = [...note.tags, ...tags];
    this.tagHelper.updateNoteTags(noteId, note.tags);

    this.save();
  }

  @action
  addNote(content: string, author: Author, title = "") {
    const id = generateNewId();
    const { tags, text } = extractTagsFromText(content);
    const date = new Date();
    const { body, previews } = parseRawNoteContent(text);
    const markdown = getParsedNoteMarkdown(text, tags);

    const note: Note = {
      id,
      body,
      previews,
      tags,
      markdown,
      author,
      title,
      dateCreated: date,
      dateModified: date,
    };

    this.notesMap.set(id, note);
    this.tagHelper.updateNoteTags(id, tags);

    this.save();
    this.scrollToBottom();

    return id;
  }

  @action
  addImportedNote(note: Note) {
    this.notesMap.set(note.id, note);
    this.tagHelper.updateNoteTags(note.id, note.tags);

    this.save();
    this.scrollToBottom();

    return note.id;
  }

  @action
  updateNoteBody(nodeId: Id, content: string) {
    const note = this.notesMap.get(nodeId);
    if (note) {
      const { tags, text } = extractTagsFromText(content);
      const { body, previews } = parseRawNoteContent(text);
      const markdown = getParsedNoteMarkdown(text, tags);

      note.body = body;
      note.previews = previews;
      note.tags = tags;
      note.markdown = markdown;
      note.dateModified = new Date();

      this.tagHelper.updateNoteTags(note.id, note.tags);
    }

    this.save();
  }

  @action
  updateNoteTitle(nodeId: Id, title: string) {
    const note = this.notesMap.get(nodeId);
    if (note) {
      note.title = title;
    }

    this.save();
  }

  @action
  updateNoteDateCreated(nodeId: Id, date: Date) {
    const note = this.notesMap.get(nodeId);
    if (note) {
      note.dateCreated = date;
    }

    this.save();
  }

  @action
  updateNoteDateModified(nodeId: Id, date: Date) {
    const note = this.notesMap.get(nodeId);
    if (note) {
      note.dateModified = date;
    }

    this.save();
  }

  @action
  deleteNote(nodeId: Id) {
    const note = this.notesMap.get(nodeId);
    if (note) {
      if (note.tags.length) {
        this.tagHelper.updateNoteTags(note.id, []);
      }

      this.notesMap.delete(nodeId);
    }

    this.save();
  }

  @action
  deleteTag(tag: Tag) {
    const noteIds = Array.from(this.notesMap.keys());

    noteIds.forEach((id: Id) => {
      const tagList = this.notesMap.get(id)!.tags;
      const index = tagList.indexOf(tag);
      if (index >= 0) {
        tagList.splice(index, 1);
      }
    });

    this.tagHelper.deleteTag(tag);

    this.save();
  }

  @action
  addPinnedTag(tag: Tag) {
    this.tagHelper.pinnedTagsSet.add(tag);
    this.save();
  }

  @action
  removePinnedTag(tag: Tag) {
    this.tagHelper.pinnedTagsSet.delete(tag);
    this.save();
  }
}
