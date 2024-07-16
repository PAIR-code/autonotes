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

import "../../pair-components/dialog";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html } from "lit";
import { customElement } from "lit/decorators.js";

import { styles } from "./tos_content.scss";

/** TOS content. */
@customElement("tos-content")
export class TOSContent extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  override render() {
    return html`
      <p>
        AutoNotes is a client-side experiment that optionally calls the
        Gemini API.
      </p>
      <p>
        All created notes and chat messages are kept in browser storage on
        your device and can be cleared
        at any time on the Settings page (see "Delete Data" section).
      </p>
      <p>
        Example projects (available on the next screen during setup, or under
        Settings) can be browsed without calling the Gemini model. However,
        in order to generate tags, summaries, and other model-based insights,
        you will need
        <a
          href="https://ai.google.dev/gemini-api/docs/api-key"
          target="_blank">
          an API key from AI Studio</a>
        to call Gemini
        (<a
          href="https://ai.google.dev/gemini-api/terms"
          target="_blank">see Gemini API Terms of Service</a>).
      </p>
      <p>This demo was created by
        <a href="https://pair.withgoogle.com/" target="_blank">
          People and AI Research (PAIR)
        </a>
        and follows Google's
        <a href="https://policies.google.com/privacy" target="_blank">
          Privacy Policy</a>.
      </p>
      <p>
        Finally, the AutoNotes code is
        <a href="http://github.com/pair-code/autonotes" target="_blank">
          available on GitHub</a>.
      </p>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "tos-content": TOSContent;
  }
}
