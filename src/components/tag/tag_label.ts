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

import "../../pair-components/icon";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { styles } from "./tag_label.scss";
import { removeLeadingHash } from "../../shared/utils";

/** Tag label component */
@customElement("tag-label")
export class TagLabel extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  @property({ type: String }) label = "";
  @property({ type: Boolean }) faded = false;
  @property({ type: Boolean }) selected = false;
  @property({ type: Object }) onLabelClicked: () => void = () => {};
  @property({ type: Boolean }) pinned = false;

  @property({ type: Boolean }) isHovered = false;
  @property({ type: Object }) onPinClicked: () => void = () => {};

  override render() {
    const tagName = removeLeadingHash(this.label);

    const labelItemClasses = (tag: string) => {
      return classMap({
        "nav-item": true,
        "label-item": true,
        selected: this.selected,
        faded: this.faded,
      });
    };

    const handleMouseEnter = (event: MouseEvent) => {
      this.isHovered = true;
    };

    const handleMouseLeave = (event: MouseEvent) => {
      this.isHovered = false;
    };

    const handleLabelClicked = (event: MouseEvent) => {
      console.log((event.target as HTMLElement).className);
      if ((event.target as HTMLElement).className.includes("pin-icon")) return;

      this.onLabelClicked();
    };

    return html`
      <div
        class=${labelItemClasses(tagName)}
        @mouseenter=${handleMouseEnter}
        @mouseleave=${handleMouseLeave}
        role="button"
        @click=${handleLabelClicked}
      >
        <div class="content">
          <div class="left">
            <div class="tag-marker">#</div>
            <div class="tag-name">${tagName}</div>
          </div>
          ${this.renderPinIcon()}
        </div>
      </div>
    `;
  }

  private renderPinIcon() {
    if (!this.isHovered && !this.pinned) {
      return nothing;
    }

    const handlePinClicked = (event: MouseEvent) => {
      this.onPinClicked();
      event.stopPropagation();
      event.preventDefault();

      this.requestUpdate();
    };

    const iconClasses = classMap({
      "pin-icon": true,
      pinned: this.pinned,
    });
    return html`
      <pr-icon
        class=${iconClasses}
        icon="keep"
        @click=${handlePinClicked}
      ></pr-icon>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "tag-label": TagLabel;
  }
}
