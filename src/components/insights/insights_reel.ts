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
import "../../pair-components/tooltip";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import { core } from "../../core/core";

import { LlmService } from "../../services/llm_service";
import { NotebookService } from "../../services/notebook_service";
import { RouterService } from "../../services/router_service";
import { SettingsService } from "../../services/settings_service";

import { QuoteInsight, WrappedInsight } from "../../shared/types";
import {
  TEXT_ENABLE_API_KEY,
  WRAPPED_INSIGHTS_TEMPLATE,
} from "../../shared/constants";
import {
  makeNotesToQuotesPrompt,
  makeNotesToObservationsPrompt,
} from "../../shared/insights/prompts";

import { styles } from "./insights_reel.scss";

const WRAPPED_INSIGHTS_SPLIT = 2; // Index at which to insert quote

/**
 * Insights reel (e.g., quotes, fun facts).
 */
@customElement("insights-reel")
export class InsightsReel extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly llmService = core.getService(LlmService);
  private readonly notebookService = core.getService(NotebookService);
  private readonly routerService = core.getService(RouterService);
  private readonly settingsService = core.getService(SettingsService);

  @state() isLoading = false;

  override render() {
    return html`
      <div class="example-buttons">${this.renderGenerateButton()}</div>
      ${this.renderCards()}
    `;
  }

  private renderCards() {
    if (this.isLoading) {
      return html`<div class="loading">Loading...</div>`;
    }

    const renderWrappedCards = (insights: WrappedInsight[]) => {
      return html`
        ${insights.map((insight: WrappedInsight) =>
          this.renderResponseCard(
            insight.label,
            insight.response,
            insight.color
          )
        )}
      `;
    };

    const renderQuoteCards = (insights: QuoteInsight[]) => {
      return html`
        ${insights.map((insight: QuoteInsight) =>
          this.renderResponseCard(
            "Quote from your notes",
            insight.quote,
            "primary",
            insight.noteId
          )
        )}
      `;
    };

    const wrapped = this.settingsService.wrappedInsights;
    const quotes = this.settingsService.quoteInsights;

    return html`
      <div class="card-wrapper">
        ${renderWrappedCards(wrapped.slice(0, WRAPPED_INSIGHTS_SPLIT))}
        ${renderQuoteCards(quotes.slice(1, 2))}
        ${renderWrappedCards(wrapped.slice(WRAPPED_INSIGHTS_SPLIT))}
        ${renderQuoteCards(quotes.slice(0, 1))}
      </div>
    `;
  }

  private renderResponseCard(
    title: string,
    body: string,
    color = "",
    ref = ""
  ) {
    if (body === "") {
      return nothing;
    }

    const onRefClick = () => {
      this.routerService.navigateToNotesPage("", [ref]);
    };

    return html`
      <div class="card ${color}">
        <div class="card--title">${title}</div>
        <div class="card--body">${body}</div>
        ${ref !== ""
          ? html`<div class="card--ref" @click=${onRefClick}>See note</div>`
          : nothing}
      </div>
    `;
  }

  private async generateWrappedInsights() {
    const rawObservations = await this.llmService.runPrompt(
      makeNotesToObservationsPrompt(
        this.notebookService.notes,
        WRAPPED_INSIGHTS_TEMPLATE
      )
    );

    // Log raw response
    console.log(rawObservations);

    const observations = JSON.parse("{" + rawObservations);
    let wrappedInsights: WrappedInsight[] = [];

    WRAPPED_INSIGHTS_TEMPLATE.forEach((insight) => {
      if (insight.id in observations) {
        wrappedInsights.push({
          id: insight.id,
          prompt: insight.prompt,
          response: observations[insight.id],
          label: insight.label,
          color: insight.color,
        });
      }
    });

    this.settingsService.setWrappedInsights(wrappedInsights);
  }

  private async generateQuoteInsights() {
    const rawQuotes = await this.llmService.runPrompt(
      makeNotesToQuotesPrompt(this.notebookService.notes)
    );

    // Log raw response
    console.log(rawQuotes);

    const quotes = JSON.parse("[" + rawQuotes);
    let quoteInsights: QuoteInsight[] = [];

    quotes.forEach((quote: { quote: string; id: string }) => {
      if (this.notebookService.getNote(quote.id)) {
        quoteInsights.push({
          noteId: quote.id,
          quote: quote.quote,
        });
      }
    });

    this.settingsService.setQuoteInsights(quoteInsights);
  }

  private renderGenerateButton() {
    const handleButtonClick = async () => {
      this.isLoading = true;

      await this.generateWrappedInsights();
      await this.generateQuoteInsights();

      this.isLoading = false;
    };

    const hasApiKey = this.settingsService.hasApiKey;
    const tooltipText = !hasApiKey ? TEXT_ENABLE_API_KEY : "";

    const wrapped = this.settingsService.wrappedInsights;
    const quotes = this.settingsService.quoteInsights;

    if (wrapped.length === 0 && quotes.length === 0) {
      return html`
        <pr-tooltip text=${tooltipText}>
          <pr-button
            ?disabled=${this.isLoading || !hasApiKey}
            @click=${handleButtonClick}
          >
            Generate highlights
          </pr-button>
        </pr-tooltip>
      `;
    }

    return html`
      <pr-tooltip text=${tooltipText}>
        <pr-icon-button
          icon="refresh"
          color="primary"
          size="small"
          variant="outlined"
          ?disabled=${this.isLoading || !hasApiKey}
          @click=${handleButtonClick}
        >
        </pr-icon-button>
      </pr-tooltip>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "insights-reel": InsightsReel;
  }
}
