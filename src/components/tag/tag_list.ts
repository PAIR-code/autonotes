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

import "./tag_label";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html } from "lit";
import { customElement } from "lit/decorators.js";

import { core } from "../../core/core";
import { NotebookService } from "../../services/notebook_service";
import { Pages, RouterService } from "../../services/router_service";

import { styles } from "./tag_list.scss";

/** Tag list view component */
@customElement("tag-list")
export class TagList extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];
  private readonly routerService = core.getService(RouterService);
  private readonly notebookService = core.getService(NotebookService);

  override render() {
    return html`
      ${this.notebookService.categories.map((tag) => this.renderTag(tag))}
    `;
  }

  private renderTag(tag: string) {
    const params = this.routerService.getActiveRouteParams();
    const activeTag = params["id"] as string | undefined;

    const selected =
      this.routerService.activePage === Pages.NOTES_TAG_SELECTED &&
      activeTag === tag;

    const pinned = this.notebookService.tagHelper.isPinnedTag(tag);
    const faded = !pinned;

    const handleLabelClicked = () => {
      const tagName = tag.slice(1, tag.length);
      this.routerService.navigateToNotesPage(tagName);
    };

    const handlePinClicked = () => {
      if (this.notebookService.tagHelper.isPinnedTag(tag)) {
        this.notebookService.removePinnedTag(tag);
      } else {
        this.notebookService.addPinnedTag(tag);
      }

      this.requestUpdate();
    };

    const tagCount = this.notebookService.getCategoryCount(tag);
    const tagText = `${tag} (${tagCount})`;

    return html`
      <tag-label
        .label=${tagText}
        .pinned=${pinned}
        .faded=${faded}
        .onPinClicked=${handlePinClicked}
        .onLabelClicked=${handleLabelClicked}
        .selected=${selected}
      >
      </tag-label>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "tag-list": TagList;
  }
}
