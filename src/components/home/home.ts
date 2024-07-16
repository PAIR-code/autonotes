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

import "../../pair-components/button";
import "../../pair-components/icon_button";
import "../insights/insights_tags";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import { styles } from "./home.scss";

/** Home page component */
@customElement("home-component")
export class HomeComponent extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  override render() {
    return html`
      <tag-insights></tag-insights>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "home-component": HomeComponent;
  }
}
