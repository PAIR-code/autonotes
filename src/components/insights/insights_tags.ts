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
import "../../pair-components/textarea";
import "../../pair-components/tooltip";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { ObservableMap } from "mobx";
import { customElement, state } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";

import { core } from "../../core/core";
import { NotebookService } from "../../services/notebook_service";
import { RouterService } from "../../services/router_service";
import { SettingsService } from "../../services/settings_service";
import { TEXT_ENABLE_API_KEY } from "../../shared/constants";

import { convertMarkdownToHTML, removeLeadingHash } from "../../shared/utils";

import { styles } from "./insights_tags.scss";
import { LlmService } from "../../services/llm_service";

/** Insights based on tags and their summaries.
 */
@customElement("tag-insights")
export class TagInsights extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly subtagsVisibleMap = new ObservableMap<string, boolean>();

  private readonly llmService = core.getService(LlmService);
  private readonly notebookService = core.getService(NotebookService);
  private readonly routerService = core.getService(RouterService);
  private readonly settingsService = core.getService(SettingsService);

  @state() isLoading = false;

  override render() {
    const categories = this.notebookService.categories.map((category) => {
      return {
        tag: category,
        count: this.notebookService.getCategoryCount(category),
      };
    });

    return html`
      ${this.renderDescription()}
      <div class="insights">
        ${categories.map((item) => this.renderCategory(item.tag, item.count))}
      </div>
    `;
  }

  private renderDescription() {
    if (this.notebookService.notes.length === 0) {
      const handleButtonClick = () => {
        this.routerService.navigateToNotesPage();
      };
      return html`
        <div class="description">
          <div>
            <h3>No notes yet</h3>
            <p>Add some notes to get started!</p>
          </div>
          <pr-button @click=${handleButtonClick}>Go to Notes</pr-button>
        </div>
      `;
    }
    if (this.notebookService.categories.length === 0) {
      const handleButtonClick = () => {
        this.routerService.navigateToSettingsPage();
      };
      return html`
        <div class="description">
          <div>
            <h3>Tag your notes</h3>
            <p>
              Your notes don't have any tags yet. You can use our
              <b>Auto-Tag Notes feature</b> in the Settings page.
            </p>
          </div>
          <pr-button @click=${handleButtonClick}>Go to Settings</pr-button>
        </div>
      `;
    }

    return nothing;
  }

  private renderCategory(tag: string, numNotes: number) {
    const subtags = this.notebookService
      .getTagsWithCategory(tag)
      .map((subtag) => {
        return {
          tag: subtag,
          count: this.notebookService.getTagCount(subtag),
        };
      })
      .sort((a, b) => {
        return a.count < b.count ? 1 : -1;
      });

    const handleLabelClicked = () => {
      this.routerService.navigateToNotesPage(removeLeadingHash(tag));
    };

    return html`
      <div class="category">
        <div class="label medium" @click=${handleLabelClicked}>
          <span class="link">${tag} (${numNotes})</span>
          ${this.renderRefreshButton(tag)}
        </div>
        ${this.renderSummary(tag)}
        <div class="subtags">
          ${subtags.map((subtag) => {
            return this.renderSubtag(subtag.tag, subtag.count);
          })}
        </div>
      </div>
    `;
  }

  private isSubtagVisible(subtag: string) {
    const isVisible = this.subtagsVisibleMap.get(subtag);
    return isVisible !== undefined && isVisible;
  }

  private setSubtagVisible(subtag: string, isVisible: boolean) {
    this.subtagsVisibleMap.set(subtag, isVisible);
  }

  private renderSubtag(subtag: string, count: number) {
    const split = subtag.split("/");
    const displayValue = split.length === 2 ? split[1] : subtag;

    const handleSubtagClicked = (e: MouseEvent) => {
      this.routerService.navigateToNotesPage(removeLeadingHash(subtag));

      e.stopPropagation();
      e.preventDefault();
    };

    const handleAddClicked = (e: MouseEvent) => {
      const isVisible = this.isSubtagVisible(subtag);
      this.setSubtagVisible(subtag, !isVisible);

      e.stopPropagation();
      e.preventDefault();
    };

    const isVisible = this.isSubtagVisible(subtag);

    return html`
      <div class="subtag">
        <div class="subtag-header" @click=${handleAddClicked}>
          <span class="label" @click=${handleSubtagClicked}
            ><span class="link">${displayValue} (${count})</span> ${isVisible
              ? this.renderRefreshButton(subtag)
              : nothing}</span
          >
          <pr-icon
            size="small"
            variant="default"
            color="neutral"
            icon=${isVisible ? "remove" : "add"}
          ></pr-icon>
        </div>
        ${isVisible
          ? html`<div class="subtag-summary">
              ${this.renderSummary(subtag)}
            </div>`
          : nothing}
      </div>
    `;
  }

  private renderSummary(tag: string) {
    const summary =
      this.notebookService.tagSummaryMap.get(removeLeadingHash(tag)) || "";
    if (!summary) return this.renderSummaryZeroState(tag);

    return html`<div class="summary">
      ${unsafeHTML(convertMarkdownToHTML(summary, /* sanitize html */ true))}
    </div>`;
  }

  private renderSummaryZeroState(tag: string) {
    return html`<div class="zero-state-text">No summary yet</div>`;
  }

  private renderRefreshButton(tag: string, text = "Generate summary") {
    const generateSummary = async (e: MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();

      this.isLoading = true;
      await this.llmService.updateTagSummary(removeLeadingHash(tag));
      this.requestUpdate();
      this.isLoading = false;
    };

    const disabled = !this.settingsService.hasApiKey;
    const tooltipText = disabled ? TEXT_ENABLE_API_KEY : text;

    return html`
      <pr-tooltip
        text=${tooltipText}
        position="RIGHT"
        .delay=${1500}
        class="refresh-button"
      >
        <pr-icon-button
          @click=${generateSummary}
          icon="refresh"
          size="small"
          color="neutral"
          variant="default"
          padding="small"
          ?disabled=${disabled || this.isLoading}
        ></pr-icon-button
      ></pr-tooltip>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "tag-insights": TagInsights;
  }
}
