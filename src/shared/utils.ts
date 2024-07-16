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
import { v4 as uuidv4 } from "uuid";
import { micromark } from "micromark";
import { gfm, gfmHtml } from "micromark-extension-gfm";
import {
  ContentBlock,
  ListBlock,
  ListItem,
  Note,
  Preview,
  ProjectMetadata,
  RawObject,
  Tag,
  TextBlock,
} from "./types";

/**
 * Generate unique id
 */
export function generateNewId(): string {
  return uuidv4();
}

/** Creates new project. */
export function createBlankProjectMetadata(): ProjectMetadata {
  const newProject: ProjectMetadata = {
    id: generateNewId(),
    title: "Untitled project",
    description: "",
    dateCreated: new Date(),
    quoteInsights: [],
    wrappedInsights: [],
  };

  return newProject;
}

/**
 * Returns:
 * - List of all tags starting with # from the given text
 * - The given text without tags
 */
export function extractTagsFromText(text: string): {
  tags: Tag[];
  text: string;
} {
  const tags: Tag[] = [];
  let currentTag = "";
  let textWithoutTags = "";
  let index = 0;

  const addTagAndReset = (resetValue = "") => {
    if (currentTag !== "#") {
      tags.push(currentTag);
    }
    currentTag = resetValue;
  };

  for (const currentCharacter of text) {
    const tagStarted = currentTag !== "";
    const startNewTag =
      !tagStarted && currentCharacter === "#" && text[index + 1] !== "/";

    if (startNewTag) {
      currentTag = "#";
    } else if (tagStarted) {
      if (currentCharacter === "#") {
        textWithoutTags += "#";
      } else if (currentCharacter === " " || currentCharacter === "\n") {
        if (currentTag !== "#") {
          tags.push(currentTag);
          // Only add whitespace/newline if there isn't already any at end
          if (textWithoutTags.trimEnd().length === textWithoutTags.length) {
            textWithoutTags += currentCharacter;
          }
        } else {
          textWithoutTags += currentTag + currentCharacter;
        }
        currentTag = "";
      } else {
        currentTag += currentCharacter;
      }
    } else {
      textWithoutTags += currentCharacter;
    }

    index += 1;
  }

  if (currentTag !== "") {
    tags.push(currentTag);
  }
  return { tags, text: textWithoutTags.trim() };
}

/**
 * Uses micromark to convert Git-flavored markdown to HTML.
 */
export function convertMarkdownToHTML(markdown: string, sanitize = false) {
  const html = micromark(markdown, {
    allowDangerousHtml: true,
    extensions: [gfm()],
    htmlExtensions: [gfmHtml()],
  });

  return sanitize ? sanitizeHtml(html) : html;
}

/**
 * Parses given string into content blocks and link previews.
 */
export function parseRawNoteContent(content: string): {
  body: ContentBlock[];
  previews: Preview[];
} {
  // Set up HTML element with converted markdown
  const html = convertMarkdownToHTML(content);
  const element = document.createElement("div");
  element.innerHTML = html;

  // Parse content into list of TextBlock and ListBlock items
  const blocks: ContentBlock[] = [];
  let currentTextBlock = document.createElement("div");

  const addTextBlock = () => {
    if (currentTextBlock.innerHTML !== "") {
      blocks.push({ type: "text", text: currentTextBlock.innerHTML });
      currentTextBlock = document.createElement("div");
    }
  };

  const hasCheckbox = (element: Element) => {
    const inputs = element.getElementsByTagName("input");
    return (
      inputs.length > 0 &&
      inputs[0].type === "checkbox" &&
      inputs[0].parentElement.tagName.toLowerCase() === "li"
    );
  };

  for (const child of element.children) {
    // If checkboxes exist, add current ContentBlocks to list
    if (child.tagName.toLowerCase() === "ul" && hasCheckbox(child)) {
      addTextBlock();
      blocks.push(convertHTMLListToListBlock(child));
    } else {
      currentTextBlock.appendChild(child.cloneNode(true));
    }
  }

  if (currentTextBlock.innerHTML.trim() !== "") {
    addTextBlock();
  }

  // NOTE: Eventually add link preview parsing
  return { body: blocks, previews: [] };
}

/**
 * Converts checkbox items (as created by micromark) into ListBlock.
 * NOTE: This is a helper function for parseRawNoteContent
 */
function convertHTMLListToListBlock(element: Element): ListBlock {
  const list = [];

  const isChecked = (element: Element) => {
    const inputElement = element.firstChild;
    return (inputElement as HTMLInputElement).checked ?? false;
  };

  for (const child of element.children) {
    list.push({
      text: child.textContent.trim(),
      isChecked: isChecked(child),
    });
  }

  return { type: "list", list };
}

/**
 * Creates new Note with given Markdown content.
 */
export function convertMarkdownToNote(
  rawMarkdown: string,
  title = "",
  date = new Date(),
): Note {
  const { tags, text } = extractTagsFromText(rawMarkdown);
  const { body, previews } = parseRawNoteContent(text);
  const markdown = getParsedNoteMarkdown(text, tags);

  return {
    author: "user",
    title: title,
    body,
    markdown,
    id: generateNewId(),
    previews,
    tags,
    dateCreated: date,
    dateModified: date,
  };
}

/**
 * Creates new Note from Keep object.
 */
export function convertKeepToNote(keepObject: RawObject): Note {
  const convertDate = (usecDate: number) => {
    return new Date(usecDate / 10 ** 3);
  };

  const dateCreated = convertDate(
    keepObject["createdTimestampUsec"] as number
  );

  const dateModified = convertDate(
    keepObject["userEditedTimestampUsec"] as number
  );

  if ("textContent" in keepObject) {
    const { tags, text } = extractTagsFromText(
      keepObject["textContent"] as string
    );

    let { body, previews } = parseRawNoteContent(text);

    const keepPreviews = () => {
      if ("annotations" in keepObject) {
        return (keepObject["annotations"] as RawObject[])
          .map(item => convertKeepPreview(item));
      } else {
        return [];
      }
    };

    const markdown = getParsedNoteMarkdown(text, tags);

    return {
      author: "user",
      title: keepObject["title"] as string || "",
      body,
      markdown,
      id: generateNewId(),
      previews: keepPreviews(),
      tags,
      dateCreated,
      dateModified,
    };

  } else {
    const markdown = (keepObject["listContent"] as RawObject[])
      .map(item => convertKeepListItemToMarkdown(item)).join("\n");

    const body: ContentBlock[] = [{
      type: "list",
      list: (keepObject["listContent"] as RawObject[])
        .map(item => convertKeepListItemToListItem(item))
    }];

    const previews: Preview[] = "annotations" in keepObject ?
      (keepObject["annotations"] as RawObject[])
        .map(item => convertKeepPreview(item))
      : [];

    return {
      author: "user",
      title: keepObject["title"] as string || "",
      body,
      markdown,
      id: generateNewId(),
      previews,
      tags: [],
      dateCreated,
      dateModified,
    };
  }
}

/**
 * Convert Keep preview content to Preview item
 */
export function convertKeepPreview(previewItem: RawObject): Preview {
  console.log('preview', previewItem);
  return {
    url: previewItem["url"] as string || "",
    title: previewItem["title"] as string || "",
    description: previewItem["description"] as string || "",
    image: "",
  };
}

/**
 * Convert Keep list content item to Markdown checkbox item
 */
export function convertKeepListItemToMarkdown(listItem: RawObject) {
  console.log('markdown list', listItem);
  return `- [${listItem["isChecked"] ? "x" : ""}] ${listItem["text"]}`;
}

/**
 * Convert Keep list content item to ListItem for ListBlock
 */
export function convertKeepListItemToListItem(listItem: RawObject): ListItem {
  console.log('listitem', listItem);
  return {
    text: listItem["text"] as string || "",
    isChecked: listItem["isChecked"] ? true : false,
  };
}

/**
 * Returns note edit content from given textWithoutTags, tags.
 */
export function getParsedNoteMarkdown(textWithoutTags: string, tags: string[]) {
  return `${textWithoutTags}\n\n${tags.join(" ")}`;
}

/**
 * Formats the date into Mon DD, HH:MM AM.
 */
export function formatDate(date: Date): string {
  const month = formatMonth(date.getMonth());
  const day = date.getDate();
  const time = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  });
  return `${month} ${day}, ${time}`;
}

/**
 * Formats the month into 3 letters.
 */
export function formatMonth(month: Number): string {
  switch (month) {
    case 0:
      return "Jan";
    case 1:
      return "Feb";
    case 2:
      return "Mar";
    case 3:
      return "Apr";
    case 4:
      return "May";
    case 5:
      return "Jun";
    case 6:
      return "Jul";
    case 7:
      return "Aug";
    case 8:
      return "Sep";
    case 9:
      return "Oct";
    case 10:
      return "Nov";
    case 11:
      return "Dec";
    default:
      return "";
  }
}

/**
 * Downloads a json object as a file.
 */
export function downloadJsonObj(obj: object, filename = "autonotes_export") {
  const dataString =
    "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(obj));
  const anchorNode = document.createElement("a");
  anchorNode.setAttribute("href", dataString);
  anchorNode.setAttribute("download", filename + ".json");
  document.body.appendChild(anchorNode);
  anchorNode.click();
  anchorNode.remove();
}

/**
 * Removes the leading hash from a tag.
 */
export function removeLeadingHash(tag: string) {
  if (tag.startsWith("#")) {
    return tag.substring(1);
  }
  return tag;
}

/**
 * Sleeps for a number of milliseconds.
 */
export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getCategoryFromTag(tag: Tag) {
  const firstWord = tag.split("/")[0];
  // If this is a hierarchical tag,
  // return the first word before the '/' as the category
  // Otherwise, return the entire tag as the category.
  const category = firstWord ? firstWord : tag;
  return category.toLowerCase();
}
