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

import { ObservableMap, computed, observable } from "mobx";
import { Id, Note, Tag } from "../shared/types";
import { getCategoryFromTag } from "../shared/utils";

function getUniqueTags(notes: Note[]): Tag[] {
  const tagSet = new Set<Tag>();
  notes.forEach((note: Note) => {
    note.tags.forEach((tag: Tag) => {
      tagSet.add(tag);
    });
  });

  const tags = Array.from(tagSet);
  return tags;
}
/**
 * Helper for manipulating Tags.
 */
export class TagHelper {
  readonly tagsToNoteIds = new ObservableMap<Tag, Id[]>();
  @observable readonly pinnedTagsSet = new Set<Tag>();

  setNotes(notes: Note[]) {
    this.tagsToNoteIds.clear();

    const tags = getUniqueTags(notes);

    tags.forEach((tag) => {
      this.tagsToNoteIds.set(tag, []);
    });

    tags.forEach((tag) => {
      notes.forEach((note) => {
        if (note.tags.includes(tag)) {
          this.tagsToNoteIds.get(tag)!.push(note.id);
        }
      });
    });
  }

  @computed get tags(): Tag[] {
    return Array.from(this.tagsToNoteIds.keys());
  }

  @computed get categories(): Tag[] {
    const categories = new Set<Tag>();
    for (const tag of this.tags) {
      const category = getCategoryFromTag(tag);
      categories.add(category.toLowerCase());
    }
    return Array.from(categories);
  }

  @computed get categoriesSortedByCount(): Tag[] {
    return this.categories.sort((a, b) => {
      if (this.isPinnedTag(a)) return -1;
      if (this.isPinnedTag(b)) return 1;

      return (
        this.categoriesToNoteIds.get(b)!.length -
        this.categoriesToNoteIds.get(a)!.length
      );
    });
  }

  @computed get categoriesToNoteIds(): ObservableMap<Tag, string[]> {
    const map = new ObservableMap<Tag, string[]>();

    this.categories.forEach((category: string) => {
      map.set(category, []);
    });

    Array.from(this.tagsToNoteIds.entries()).forEach((entry) => {
      const [tag, noteIds] = entry;

      const category = getCategoryFromTag(tag);
      const categoryNoteIds = map.get(category);
      if (categoryNoteIds) {
        noteIds.forEach((noteId) => {
          if (!categoryNoteIds.includes(noteId)) {
            categoryNoteIds.push(noteId);
          }
        });
      }
    });
    return map;
  }

  @computed get pinnedTags(): Tag[] {
    return Array.from(this.pinnedTagsSet);
  }

  setPinnedTags(tags: Tag[]) {
    this.pinnedTagsSet.clear();
    tags.forEach((tag) => {
      this.pinnedTagsSet.add(tag);
    });
  }

  isPinnedTag(tag: Tag): boolean {
    return this.pinnedTagsSet.has(tag);
  }

  // Gets tags sorted in descending order by count. (Most frequent tags are
  // listed first)
  @computed get tagsSortedByCount(): Tag[] {
    return this.tags.sort((a, b) => {
      if (this.isPinnedTag(a)) return -1;
      if (this.isPinnedTag(b)) return 1;

      return (
        this.tagsToNoteIds.get(b)!.length - this.tagsToNoteIds.get(a)!.length
      );
    });
  }

  @computed get tagsSortedByAlphabetical(): Tag[] {
    return this.tags.sort((a, b) => {
      if (this.isPinnedTag(a)) return -1;
      if (this.isPinnedTag(b)) return 1;

      return a < b ? -1 : 1;
    });
  }

  getNoteIdsWithTag(tag: Tag): Id[] {
    return this.tagsToNoteIds.get(tag) || [];
  }

  getNoteIdsWithCategory(category: Tag): Id[] {
    return this.categoriesToNoteIds.get(category) || [];
  }

  updateNoteTags(noteId: Id, tags: Tag[]) {
    const allTags = Array.from(this.tagsToNoteIds.keys());
    allTags.forEach((tag) => {
      const noteIds = this.tagsToNoteIds.get(tag)!;

      if (tags.includes(tag)) {
        if (!noteIds.includes(noteId)) {
          noteIds.push(noteId);
        }
      } else {
        if (noteIds.includes(noteId)) {
          noteIds.splice(noteIds.indexOf(noteId), 1);
        }
      }

      if (noteIds.length === 0) {
        this.tagsToNoteIds.delete(tag);
      }
    });

    tags.forEach((tag) => {
      if (!this.tagsToNoteIds.has(tag)) {
        this.tagsToNoteIds.set(tag, [noteId]);
      }
    });
  }

  deleteTag(tag: Tag) {
    this.tagsToNoteIds.delete(tag);
  }
}
