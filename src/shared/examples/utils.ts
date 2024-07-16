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

import { ProjectMetadata, RawObject } from "../types";
import {
  METADATA as aliceMetadata,
  NOTES as aliceNotes,
  CHAT as aliceChat,
  SUMMARIES as aliceSummaries,
} from "./alice_in_wonderland";

import {
  METADATA as anneMetadata,
  NOTES as anneNotes,
  CHAT as anneChat,
  SUMMARIES as anneSummaries,
} from "./anne_of_green_gables";

/** Example project info as stored (e.g., not yet in Note structure). */
export const EXAMPLE_PROJECTS: {
  metadata: ProjectMetadata,
  project: RawObject,
} [] = [
  {
    metadata: aliceMetadata,
    project: {
      "notes": aliceNotes,
      "chat": aliceChat,
      "tagSummaries": aliceSummaries,
    },
  },
  {
    metadata: anneMetadata,
    project: {
      "notes": anneNotes,
      "chat": anneChat,
      "tagSummaries": anneSummaries,
    },
  },
];