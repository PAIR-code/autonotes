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

import { extractTagsFromText, parseRawNoteContent } from "./utils";

describe("extractTagsFromBody", () => {
  it("tag list is empty, new text is unchanged when there are no tags", () => {
    const text = "No tags are present in this text";
    const result = extractTagsFromText(text);

    expect(result.tags).toEqual([]);
    expect(result.text).toEqual(text);
  });

  it("correctly extracts 1 tag from end of text", () => {
    const textWithoutTag = "This is the part without the tag";
    const tag = "#tag";

    // With whitespace
    let result = extractTagsFromText(textWithoutTag + " " + tag);
    expect(result.tags).toEqual([tag]);
    expect(result.text).toEqual(textWithoutTag);

    // Without whitespace
    result = extractTagsFromText(textWithoutTag + tag);
    expect(result.tags).toEqual([tag]);
    expect(result.text).toEqual(textWithoutTag);
  });

  it("correctly extracts 1 tag from start of text", () => {
    const textWithoutTag = "This is the part without the tag";
    const tag = "#tag";

    // With whitespace
    const result = extractTagsFromText(tag + " " + textWithoutTag);
    expect(result.tags).toEqual([tag]);
    expect(result.text).toEqual(textWithoutTag);
  });

  it("correctly extracts 1 tag from middle of text", () => {
    const textStart = "This is the part";
    const textEnd = " without the tag";
    const tag = "#tag";

    // With whitespace
    let result = extractTagsFromText(textStart + " " + tag + textEnd);
    expect(result.tags).toEqual([tag]);
    expect(result.text).toEqual(textStart + textEnd);

    // Without whitespace
    result = extractTagsFromText(textStart + tag + textEnd);
    expect(result.tags).toEqual([tag]);
    expect(result.text).toEqual(textStart + textEnd);
  });

  it("ignores hashtags if part of markdown heading syntax", () => {
    const textWithoutTag = "# Heading 1";
    const tag = "#tag";

    const result = extractTagsFromText(textWithoutTag + tag);
    expect(result.tags).toEqual([tag]);
    expect(result.text).toEqual(textWithoutTag);
  });
});

describe("parseRawNoteContent", () => {
  it("empty Markdown converts to empty ContentBlock, Preview lists", () => {
    const markdown = "";
    const { body, previews } = parseRawNoteContent(markdown);

    expect(body).toEqual([]);
    expect(previews).toEqual([]);
  });

  it("HTML in markdown converts to TextBlock", () => {
    const markdown = "<h1>Heading</h1><ul><li>Item 1</li><li>Item 2</li></ul>";
    const expectedTextBlock = {
      type: "text",
      text: markdown,
    };

    const { body, previews } = parseRawNoteContent(markdown);
    expect(body).toEqual([expectedTextBlock]);
    expect(previews).toEqual([]);
  });

  it("Markdown converts to TextBlock", () => {
    const markdown = "Paragraph";
    const expectedTextBlock = {
      type: "text",
      text: "<p>Paragraph</p>",
    };

    const { body, previews } = parseRawNoteContent(markdown);

    expect(body).toEqual([expectedTextBlock]);
    expect(previews).toEqual([]);
  });

  it("checkbox-only content converts to ListBlock", () => {
    const markdown = "- [ ] Unchecked\n- [x] Checked";
    const expectedListBlock = {
      type: "list",
      list: [
        { text: "Unchecked", isChecked: false },
        { text: "Checked", isChecked: true },
      ],
    };

    const { body, previews } = parseRawNoteContent(markdown);
    expect(body).toEqual([expectedListBlock]);
    expect(previews).toEqual([]);
  });

  it("text and checkboxes convert to ContentBlock list", () => {
    const checklistOneMarkdown = "- [ ] Unchecked\n- [x] Checked";
    const checklistTwoMarkdown = "- [x] Checked\n- [ ] Unchecked";
    const textMarkdown = "Paragraph";

    const markdown = `${checklistOneMarkdown}\n\n${textMarkdown}\n${checklistTwoMarkdown}`;

    const expectedListBlockOne = {
      type: "list",
      list: [
        { text: "Unchecked", isChecked: false },
        { text: "Checked", isChecked: true },
      ],
    };

    const expectedListBlockTwo = {
      type: "list",
      list: [
        { text: "Checked", isChecked: true },
        { text: "Unchecked", isChecked: false },
      ],
    };

    const expectedTextBlock = {
      type: "text",
      text: "<p>Paragraph</p>",
    };

    const { body, previews } = parseRawNoteContent(markdown);
    expect(body).toEqual([
      expectedListBlockOne,
      expectedTextBlock,
      expectedListBlockTwo,
    ]);
    expect(previews).toEqual([]);
  });
});
