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
 */ /** Functions that create prompts and process the corresponding responses */

import { ChatMessage, Note, Tag } from "./types";
import { formatDate } from "./utils";

/** Extracts tags from a body of text */
export function makeTagsFromContentPrompt(
  content: string,
  tags: Tag[],
  contentTitle: string = ""
): {
  prompt: string;
  stopToken: string;
} {
  const systemTags = ["#chatHistory"];
  const defaultTags = ["#readingList", "#journal", "#todo"];
  const mergeTags = tags.concat(defaultTags);
  const filterTags = mergeTags.filter((item) => !systemTags.includes(item));
  const uniqueTags = new Set(filterTags);
  const promptTags = Array.from(uniqueTags);

  return {
    prompt: `
[Current Tags]
{ ${promptTags.join(", ")} }

[Note]
${contentTitle}
${content}

[Instructions]
Based on the content in New Note select 1-3 of most relevant subject matter Tags that best represents the note content. Try to use Current Tags but create new tags if necessary. Don't repeat content tags that are close to one another. Don't use overly specific tags just for this note.
For short, couple line, notes try to use only one tag, but for longer notes use more tags. Alway use camel casing for tags, and always use singular (not plural) tags. 

Make all of these hierarchical tags, in the format #category/tag.

Please answer with the following format: { #category/tag1, #category/tag2, ... }

[Content Tags]
{`,
    stopToken: "}",
  };
}

// new function
export function makeChatPromptFromRelevantNotes(
  chats: ChatMessage[],
  notes: string[],
  tagSummaries: Map<string, string>
): {
  chatPrompt: string;
  chatStopToken: string;
} {
  let chatString = "";
  // Loop over chats and build chatString.
  for (const chat of chats) {
    chatString += `${chat.author === "system" ? "Model: " : "User: "}${
      chat.body
    }\n\n`;
  }

  let notesString = "";
  // loop over notes ids and build relevantNotes
  for (let n = 0; n < notes.length; n++) {
    notesString += `-- Note -- \n${notes[n]} \n\n`;
  }

  if (notesString == "") {
    for (const tag of tagSummaries.keys()) {
      const summary = tagSummaries.get(tag)!;
      notesString += `-- ${tag} -- \n ${summary}`;
    }
  }

  return {
    chatPrompt: `[Instructions]
Answer the latest users request throughly and contextually based on Relevant Notes, previous conversation, and general knowledge (in this order). Answer questions with short markdown responses.

[Previous Conversation]
${chatString}
[Relevant Notes]
${notesString}
[User Request]
User: ${chats[chats.length - 1].body}

Model:`,
    chatStopToken: "User:",
  };
}

export function processChatPromptFromRelevantNotesResponse(response: string) {}

export function makeRelevantNotesPrompt(chats: ChatMessage[], notes: Note[]) {
  // get the lastChat body
  const lastChat = chats[chats.length - 1].body;
  // make a string of notes body content

  const notesIds = notes.map((note) => note.id);
  const notesTitle = notes.map((note) => note.title);
  const notesBody = notes.map((note) => note.markdown);
  const notesDate = notes.map((note) => formatDate(new Date(note.dateCreated)));
  // iterate over notesTitle, notesBody and notesTags to make a string of each note.
  let notesString = "";
  for (let i = 0; i < notesIds.length; i++) {
    notesString += `-- Note ${notesIds[i]} -- \n$${notesTitle[i]} \n ${notesDate[i]} \n ${notesBody[i]} \n\n`;
  }

  return {
    prompt: `[All Notes]
${notesString}

[Chat Request]
${lastChat}

[Instructions]
Look at All Notes and Chat Request above and pick any number of Relevant Notes that match the Chat Request. 
Answer with an ordered list: { "Note 42234", "Note 195654-2123", ... }
If none of the notes are relevant, it's okay to answer { }. Don't include the content of the note, just the Note ID in the response.

[Relevant Notes]
{`,
    stopToken: "}",
  };
}

export function processRelevantNotesResponse(response: string) {
  if (response === "") return [];

  if (response.startsWith("{")) {
    response = response.substring(1);
  }

  if (response.endsWith("}")) {
    response = response.substring(0, response.length - 1);
  }

  const responseNotes = response
    .split(",")
    .map((value) => value.trim())
    .map((value) => value.replace("Note ", ""))
    // Strip all instances of `"`
    .map((value: string) => value.replace(/"/g, ""));
  return responseNotes;
}

/** Extracts tag strings from the model response */
export function processTagsFromContentResponse(response: string): Tag[] {
  if (response === "") return [];

  if (response.startsWith("{")) {
    response = response.substring(1);
  }

  if (response.endsWith("}")) {
    response = response.substring(0, response.length - 1);
  }

  return response.split(",").map((value) => value.trim());
}

/**
 * Extracts relevant tag strings to the given query out of the provided tags.
 */
export function makeRelevantTagsPrompt(
  query: string,
  tags: Tag[]
): {
  prompt: string;
  stopToken: string;
} {
  return {
    prompt: `Here are all existing tags: ${tags.join(", ")}.
  What are the top 2-3 relevant existing tags for this query: ${query}
  Please format them in this format: [#tag1,#tag2]
  The relevant tags are: [
  `,
    stopToken: "]",
  };
}

/** Extracts tag strings from the model response */
export function processRelevantTagsResponse(response: string): Tag[] {
  if (response === "") return [];

  if (response.startsWith("[")) {
    response = response.slice(1, response.length - 1);
  }

  if (response.endsWith("]")) {
    response = response.substring(0, response.length - 2);
  }

  return response.split(",").map((value) => value.trim());
}

export function makeTagSummaryPrompt(
  notes: Note[],
  tag: Tag
): {
  prompt: string;
  stopToken: string;
} {
  const notesIds = notes.map((note) => note.id);
  const notesTitle = notes.map((note) => note.title);
  const notesBody = notes.map((note) => note.markdown);
  // iterate over notesTitle and notesBody to make a string of each note.
  let notesString = "";
  for (let i = 0; i < notesIds.length; i++) {
    notesString += `-- Note ${notesIds[i]} -- \n${notesTitle[i]} \n${notesBody[i]} \n\n`;
  }

  return {
    prompt: `[EXAMPLE]

[Instructions]
You're a summary agent that looks at the #history Notes and make a high-level summary across the notes that includes details about the topic, including details extracted from each note. Write a brief and concise few sentences in the Tag Summary because the full note will be shown after the summary. Use markdown to make the notes more readable.

[#grocery Notes]
-- Note 0a7f6708-8f32-49c6-9c60-32fc3f2e8503 --
Regular Items:

- Fresh Fruit

Last Minute Additions:

- Mixed Drinks
#grocery

-- Note 00c5b342-c878-472e-8836-c268f822e3a1 --

- Remember to check for ripe and fresh fruit.
- Pick up your favorite flavor of cottage cheese.

#shopping #grocery

[#grocery Summary] 
{ These notes contain regular **grocery items** and some last minute additions. 
Items include:
- Fresh Fruit [(note)](#/notes/?noteId=00c5b342-c878-472e-8836-c268f822e3a1)
- Cottage Cheese [(note)](#/notes/?noteId=00c5b342-c878-472e-8836-c268f822e3a1) 
- Mixed drinks [(note)](#/notes/?noteId=0a7f6708-8f32-49c6-9c60-32fc3f2e8503) }

[EXAMPLE]

[Instructions]
You're a summary agent that looks at the #${tag} Notes and make a high-level summary across the notes that includes details about the topic, including details extracted from each note. Write a brief and concise few sentences in the Tag Summary because the full note will be shown after the summary. Use markdown to make the notes more readable, bolding the most important and meaningful words, key words, proper nouns.

Include the relevant note ids as markdown links.

[#${tag} Notes]
${notesString}
[#${tag} Summary] 
{`,
    stopToken: "}",
  };
}

export function processTagSummaryResponse(response: string): string {
  if (response.startsWith("{")) {
    response = response.substring(1);
  }

  if (response.endsWith("}")) {
    response = response.substring(0, response.length - 1);
  }

  return response;
}

/** Extracts tags from a body of text */
export function makeTitleFromContentPrompt(content: string): {
  prompt: string;
  stopToken: string;
} {
  return {
    prompt: `
[Note]
${content}

[Instructions]
Based on the content in New Note, please generate a suitable title that is 1-6 words long.

[Title]
{`,
    stopToken: "}",
  };
}
