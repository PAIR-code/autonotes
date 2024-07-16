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

interface SpeechResultCallback {
  (text: string, isFinal: boolean): void;
}

interface ListeningStoppedCallback {
  (): void;
}

export class Transcriber {
  private recognition: SpeechRecognition | null = null;
  private speechResultCallback: SpeechResultCallback;
  private listeningStoppedCallback: ListeningStoppedCallback;

  @observable
  public isListening: boolean = false;

  constructor(
    speechResultCallback: SpeechResultCallback,
    listeningStoppedCallback: ListeningStoppedCallback,
    continuous = true
  ) {
    makeObservable(this);

    this.speechResultCallback = speechResultCallback;
    this.listeningStoppedCallback = listeningStoppedCallback;

    if (!("webkitSpeechRecognition" in window)) {
      throw new Error("Couldn't find webkitSpeechRecognition in window");
    }

    this.recognition = new webkitSpeechRecognition();
    this.recognition.continuous = continuous;
    this.recognition.interimResults = true;
    this.recognition.lang = "en-GB";

    // called by speech recognition engine
    this.recognition.onstart = () => {
      console.log("info_speak_now");
      this.isListening = true;
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.log(`Recognition error: ${event.message} - ${event.error}`);
    };

    // called by speech recognition engine
    this.recognition.onend = () => {
      console.log("info_end");
      this.isListening = false;
      this.listeningStoppedCallback();
    };

    // called by speech recognition engine
    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      this.handleSpeechResult(event);
    };
  }

  startListening() {
    this.isListening = true;
    this.recognition.start();
  }

  stopListening() {
    this.isListening = false;
    this.recognition.stop();
  }

  // Called by recognizer.
  handleSpeechResult(event: SpeechRecognitionEvent) {
    let interimTranscript = "";
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      console.log(event.results);
      // confidence > 0 is required for Android Chrome
      if (event.results[i].isFinal && event.results[i][0].confidence > 0) {
        const line: string = event.results[i][0].transcript;
        if (!line) {
          return;
        }
        this.speechResultCallback(line, true);
      } else {
        interimTranscript += event.results[i][0].transcript;
        if (interimTranscript !== "") {
          this.speechResultCallback(interimTranscript, false);
        }
      }
    }
  }
}
