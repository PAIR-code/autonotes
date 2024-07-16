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

/** Functions that create prompts and process the corresponding responses.
 *  Fork this file to experiment with your own insights prompts.
 */

import { Note, WrappedInsight } from "../types";

/** Create notes string for prompts. */
function makeNotesString(notes: Note[]): string {
  let notesString = "";
  notes.forEach((note) => {
    notesString += `-- Note ID: ${note.id} --\n${note.title}\n${note.markdown}\n\n`;
  });
  return notesString;
}

/** Extract interesting quotes from notes. */
export function makeNotesToQuotesPrompt(notes: Note[]): string {
  const notesString = makeNotesString(notes);

  return `
[All Notes]
${notesString}

[Instructions]
You are a creative writer who is searching through this dataset of All Notes
for 3 interesting sentences from notes that will become quotes on social media.
These should sound beautiful or funny and be suited to Pinterest or a TEDx Talk.
Do not repeat the same quote twice.

Please return as a single JSON list that contains a JSON for each
quote, along with the note id that the quote is from. For example:

[{ "quote": "This is a quote", "id": "12345" }]

[Quotes]
[
    `;
}

/** Make observations across all notes. */
export function makeNotesToObservationsPrompt(
  notes: Note[],
  inputs: WrappedInsight[]
): string {
  const notesString = makeNotesString(notes);
  const questionsString = inputs
    .map((input) => `${input.id}. ${input.prompt}`)
    .join("\n");

  return `
[All Notes]
${notesString}

[Instructions]
You are a creative journalist who is searching through this dataset of All Notes
to better understand the person who wrote the notes. Answer the following
questions.

${questionsString}

Please return a map of the question number to its string response.
If the response has several parts, separate with commas.
If the answer cannot be found, do not return anything.
Do not repeat the question.
For example:

{ "1": "playing guitar, knitting, cooking", "2": "" }

[Observations]
{
  `;
}
