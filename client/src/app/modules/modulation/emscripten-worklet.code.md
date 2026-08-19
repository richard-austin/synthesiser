```cpp
#include <emscripten/webaudio.h>
#include <emscripten/bind.h>
#include <iostream>

// Unique ID or name for your custom worklet processor
const char* WORKLET_NODE_NAME = "MyWasmProcessor";

// Global handle to the Web Audio Context
EMSCRIPTEN_WEBAUDIO_T audio_context;

// 1. Audio Processing Callback (Runs on the real-time audio thread)
bool audio_process_cb(int num_inputs, const AudioSampleFrame* inputs,
                      int num_outputs, AudioSampleFrame* outputs,
                      void* user_data) {
    // Basic stereo bypass or generator logic
    for (int ch = 0; ch < outputs[0].numberOfChannels; ++ch) {
        for (int sample = 0; sample < 128; ++sample) {
            // Processing: Write/Modify outputs[0].data[ch * 128 + sample]
            // Example: Generate pure silence or simple pass-through
            outputs[0].data[ch * 128 + sample] = 0.0f; 
        }
    }
    return true; // Keep the audio node alive
}

// 2. Callback executed once the Audio Worklet thread has successfully started
void worklet_thread_initialized(EMSCRIPTEN_WEBAUDIO_T ctx, bool success, void* user_data) {
    if (!success) return;

    // Define output configurations (1 output node with 2 channels/stereo)
    int output_channel_counts[] = { 2 };

    // Instantiate your WebAudio node inside the graph
    uint32_t node = emscripten_create_wasm_audio_worklet_node(
        ctx, 
        WORKLET_NODE_NAME, 
        output_channel_counts, 1, 
        &audio_process_cb, 
        nullptr
    );

    // Connect the Wasm node directly to the hardware destination speakers
    emscripten_connect_web_audio_node(node, 0, 0, 0); 
}

// 3. Main entrypoint triggered by JavaScript to boot the subsystem
void init_audio_graph(int raw_ctx_handle) {
    // Register the JS-created AudioContext within Emscripten
    audio_context = emscriptenRegisterAudioObject(raw_ctx_handle);

    // Start the dedicated AudioWorklet thread context asynchronously
    emscripten_start_wasm_audio_worklet_thread_async(
        audio_context, 
        worklet_thread_initialized, 
        nullptr
    );
}

// Bind the initialization function so Angular can invoke it
EMSCRIPTEN_BINDINGS(audio_module) {
    emscripten::function("initAudioGraph", &init_audio_graph);
}

```

```bash
emcc audio_processor.cpp -o src/assets/wasm/audio_processor.js \
  -O3 \
  -s WASM=1 \
  -s AUDIO_WORKLET=1 \
  -s WASM_WORKERS=1 \
  -s SINGLE_FILE=1 \
  -s EXPORTED_RUNTIME_METHODS='["AUDIO_WORKLET"]' \
  --bind
```

```typescript
import { Component } from '@angular/core';

declare var Module: any; // Emscripten runtime hook

@Component({
  selector: 'app-audio-player',
  standalone: true,
  template: `<button (click)="startAudio()">Start C++ Audio</button>`,
})
export class AudioPlayerComponent {
  private audioContext!: AudioContext;

  async startAudio() {
    // 1. Browsers require user interaction to kick off an AudioContext
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    // 2. Resolve the absolute path to your Emscripten glue script
    const wasmScriptUrl = new URL('/assets/wasm/audio_processor.js', import.meta.url).href;

    // 3. Inject the Emscripten script module directly into the Web Audio Worklet
    await this.audioContext.audioWorklet.addModule(wasmScriptUrl);

    // 4. Initialize Emscripten Runtime Properties
    // This tells Emscripten to run inside the Web Audio Context scope
    if (typeof Module === 'undefined') {
      (window as any).Module = {
        onRuntimeInitialized: () => {
          // Pass the numeric pointer representation of the audio context to C++
          const ctxHandle = (Module as any).getAudioObjectHandle(this.audioContext);
          Module.initAudioGraph(ctxHandle);
        }
      };
    }

    // 5. Explicitly inject the main Emscripten script to start the execution flow
    const scriptTag = document.createElement('script');
    scriptTag.src = wasmScriptUrl;
    document.body.appendChild(scriptTag);
  }
}
```

```json
"serve": {
  "builder": "@angular-devkit/build-angular:dev-server",
  "options": {
    "headers": {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp"
    }
  }
}
```

```
[ Angular Click Event ]
          │
          ▼
[ Create AudioContext ] ──► [ Inject script via addModule() ]
          │
          ▼
[ Emscripten Glue Script ] ──► [ Spawns WASM Audio Worker Thread ] ──► [ C++ Audio Callback Loops ]
```
