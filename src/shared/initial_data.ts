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

import { Author, ChatMessage, Id, Note, Tag, TagSummaryItem } from "./types";
import { parseRawNoteContent } from "./utils";

/** Note IDs for onboarding notes. */
export const ONBOARDING_NOTE_INTRO_ID = "a";
export const ONBOARDING_NOTE_INFO_ID = "b";

/** Returns a blank, unsaved note. */
export function makeBlankNote(): Note {
  const author: Author = "system";
  return {
    author,
    title: "",
    body: [],
    markdown: "",
    id: "",
    previews: [],
    tags: [],
    dateCreated: new Date(),
    dateModified: new Date(),
  };
}

export function makeOnboardingNotes(): Note[] {
  const welcomeNote = makeBlankNote();
  welcomeNote.title = "👋 Welcome to AutoNotes";
  welcomeNote.body = [];
  const welcomeContent = `Autonotes is an AI-powered notetaking experiment that helps you organize and explore your personal notes.
Features include:

- **Hierarchical tagging:** Browse your notes via two layers of (auto-generated) tags and summaries
- **Chat with your notes**: Ask Gemini questions about your notes, or convert conversations into new notes
- **Fun highlights**: Generate a personalized recap of your notes

Feel free to delete this note and start making your own!
`;
  const { body, previews } = parseRawNoteContent(welcomeContent);
  welcomeNote.markdown = `${welcomeContent}\n\n#autonotes`;
  welcomeNote.body = body;
  welcomeNote.previews = previews;
  welcomeNote.id = ONBOARDING_NOTE_INTRO_ID;
  welcomeNote.tags = ["#notetaking/autonotes"];

  const aboutNote = makeBlankNote();
  aboutNote.title = "📖 About AutoNotes";
  const aboutContent = `AutoNotes was launched in July 2024 by People & AI Research (PAIR).

- [Read the Medium article](https://medium.com/people-ai-research/adventures-with-ai-powered-notetaking-4aed40f006c1)
- [View code on GitHub](https://github.com/pair-code/autonotes)
`;
  const parsedContent = parseRawNoteContent(aboutContent);
  aboutNote.markdown = `${aboutContent}\n\n#autonotes`;
  aboutNote.body = parsedContent.body;
  aboutNote.previews = parsedContent.previews;
  aboutNote.tags = ["#notetaking/autonotes"];
  aboutNote.id = ONBOARDING_NOTE_INFO_ID;

  return [welcomeNote, aboutNote];
}

function makeBlankChatMessage(): ChatMessage {
  return {
    id: "",
    author: "system",
    body: "",
    dateCreated: new Date(),
  };
}

export function makeOnboardingChat(): ChatMessage[] {
  const message = makeBlankChatMessage();
  message.id = "chat-a";
  message.body = `👋 Hi there! I'm the **AutoNotes chatbot**, and I'm here to help you get the most out of your notes!

I can help you:
- Find information in your notes
- Create new notes by starting your message with **@note**

Like my friends Gemini and ChatGPT, I can also answer other questions that you may have. You can save the answers as notes in order to reference them later.`;
  return [message];
}

export function makeOnboardingTagSummary(tagName: string): TagSummaryItem {
  const autonotesSummary = {"tag": tagName, "summary": `**AutoNotes** is an AI-powered notetaking experiment launched in July 2024 by **People & AI Research (PAIR)**. It features:\n\n- Hierarchical tagging [(note)](#/notes/?noteId=${ONBOARDING_NOTE_INTRO_ID})\n- Chat with your notes [(note)](#/notes/?noteId=${ONBOARDING_NOTE_INTRO_ID})\n- Fun highlights [(note)](#/notes/?noteId=${ONBOARDING_NOTE_INTRO_ID})\n\nRead the article on [Medium](https://medium.com/people-ai-research/adventures-with-ai-powered-notetaking-4aed40f006c1) or view the code on [GitHub](https://github.com/pair-code/autonotes) [(note)](#/notes/?noteId=${ONBOARDING_NOTE_INFO_ID}).`} as TagSummaryItem;
  return autonotesSummary;
}