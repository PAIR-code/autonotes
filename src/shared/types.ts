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

/** AutoNotes types */

/**
 * Generic wrapper type for constructors, used in the DI system.
 */
// tslint:disable-next-line:interface-over-type-literal
export type Constructor<T> = {
  // tslint:disable-next-line:no-any
  new (...args: any[]): T;
};

/** An unparsed object (i.e., project from import). */
export declare interface RawObject {
  [key: string]: unknown;
}

/**
 * Model response from the API
 */
export interface ModelResponse {
  score?: number;
  text: string;
}

/**
 * Author type, e.g. who created a note or chat exchange.
 */
export type Author = "user" | "system";

/**
 * String ids, e.g. for notes
 */
export type Id = string;

/**
 * Tags, e.g. for notes
 */
export type Tag = string;

/**
 * A single note in the notebook app.
 */
export declare interface Note {
  id: Id;
  author: Author;
  title: string;
  body: ContentBlock[];
  markdown: string;
  previews: Preview[];
  tags: Tag[];
  dateCreated: Date;
  dateModified: Date;
}

/**
 * A single content block in a note.
 */
export type ContentBlock = TextBlock | ListBlock;

/**
 * Types of content blocks.
 */
export type ContentBlockType = "text" | "list";

/**
 * Base block for content blocks.
 */
export declare interface TypedContentBlock<T = ContentBlockType> {
  type: T;
}

/**
 * Text content block.
 */
export declare interface TextBlock extends TypedContentBlock<"text"> {
  text: string;
}

/**
 * List content block.
 */
export declare interface ListBlock extends TypedContentBlock<"list"> {
  list: ListItem[];
}

/**
 * ListBlock item.
 */
export declare interface ListItem {
  text: string;
  isChecked: boolean;
}

/**
 * Preview item.
 */
export declare interface Preview {
  url: string;
  title: string;
  description: string;
  image: string;
}

/**
 * A single chat message in the notebook app.
 */
export declare interface ChatMessage {
  id: Id;
  author: Author;
  body: string;
  dateCreated: Date;
  referencedNoteIds?: Id[];
  createdNoteId?: Id;
}

/**
 * A single prompt call in the notebook app, stored in PromptHistoryService.
 */
export declare interface PromptCall {
  prompt: string;
  response: string;
  processedResponse?: string | string[];
  stopTokens: string[];
  timestamp: Date;
  promptName: string;
}

/**
 * Project metadata for settings page.
 */
export declare interface ProjectMetadata {
  id: string;
  title: string;
  description: string;
  dateCreated: Date;
  quoteInsights: QuoteInsight[];
  wrappedInsights: WrappedInsight[];
}

/** Color themes. */
export enum ColorTheme {
  WINTERGLOW_DARK = "winterglow-dark",
  WINTERGLOW_LIGHT = "winterglow-light",
  SUGARPLUM_DARK = "sugarplum-dark",
  SUGARPLUM_LIGHT = "sugarplum-light",
}

/** Text sizes. */
export enum TextSize {
  SMALL = "small",
  MEDIUM = "medium",
  LARGE = "large",
}

/** API type. */
export enum ApiType {
  AI_STUDIO = "ai-studio",
  VERTEX_AI = "vertex-ai", // Coming soon...
}

/** API type. */
export enum GeminiModelType {
  GEMINI_PRO = "gemini-pro",
  GEMINI_PRO_LATEST = "gemini-1.5-flash-latest",
}

/** Wrapped insights item. */
export interface WrappedInsight {
  id: string;
  prompt: string;
  response: string;
  label: string;
  color: string;
}

/** Insights quote item. */
export interface QuoteInsight {
  quote: string;
  noteId: string;
}

/** Tag summary item. */
export interface TagSummaryItem {
  tag: Tag;
  summary: string;
}
