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

import { makeObservable, observable } from "mobx";

interface SpeechSynthesisStoppedCallback {
  (): void;
}

export class Synthesizer {
  private utterance: SpeechSynthesisUtterance | null = null;
  private synth: SpeechSynthesis | null = null;
  private speechStoppedCallback: SpeechSynthesisStoppedCallback;

  @observable
  public isSpeaking = false;

  constructor(speechStoppedCallback: SpeechSynthesisStoppedCallback) {
    if (!("speechSynthesis" in window)) {
      throw new Error("Couldn't find speechSynthesis in window");
    }

    makeObservable(this);
    this.synth = window.speechSynthesis;
  }

  setUtterance(text: string) {
    const utterance = new SpeechSynthesisUtterance(text);

    utterance.onstart = () => {
      console.log("Speech synthesis started");
      this.isSpeaking = true;
    };

    utterance.onend = () => {
      console.log("Speech synthesis stopped");
      this.isSpeaking = false;
    };

    this.utterance = utterance;
  }

  startSpeaking() {
    if (this.utterance) {
      this.isSpeaking = true;
      this.synth.speak(this.utterance);
    } else {
      console.log("Speech synthesis failed: No utterance defined");
    }
  }

  stopSpeaking() {
    this.isSpeaking = false;
    this.synth.cancel();
  }
}
