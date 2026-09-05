#include <emscripten/console.h>
#include "portamento.h"
#include <math.h>

#include "../.komple/installs/emscripten/upstream/emscripten/system/lib/libunwind/src/shadow_stack_unwind.h"

// Initialize the queue
void initQueue(CircularQueue *q) {
    q->front = 0;
    q->rear = -1;
    q->size = 0;
}

// Check if the queue is full
bool isFull(CircularQueue *q) {
    return (q->size == CAPACITY);
}

// Check if the queue is empty
bool isEmpty(CircularQueue *q) {
    return (q->size == 0);
}

// Add an element to the rear of the queue (Enqueue)
bool enqueue(CircularQueue *q, float value) {
    if (isFull(q)) {
        emscripten_console_logf("Queue Overflow! Cannot enqueue %f.\n", value);
        return false;
    }

    // Circularly increment the rear index
    q->rear = (q->rear + 1) % CAPACITY;
    q->items[q->rear] = value;
    q->size++;
    emscripten_console_logf("enqueue size %d\n", q->size);
    return true;
}

// Remove and return the front element of the queue (Dequeue)
float dequeue(CircularQueue *q) {
    if (isEmpty(q)) {
        emscripten_console_logf("Queue Underflow! Cannot dequeue.\n");
        return -1.0f; // Error flag indicating empty queue
    }

    int dequeuedValue = q->items[q->front];

    // Circularly increment the front index
    q->front = (q->front + 1) % CAPACITY;
    q->size--;
    emscripten_console_logf("dequeued size %d\n", q->size);
    return dequeuedValue;
}

int queueSize(CircularQueue *q) {
    return q->size;
}

// View the front element without removing it (Peek)
float peek(CircularQueue *q) {
    if (isEmpty(q)) {
        emscripten_console_logf("Queue is empty! Nothing to peek.\n");
        return -1.0f;
    }
    return q->items[q->front];
}

void initPortamentoData(PortamentoData *data) {
    data->previousFrequency = -1.0f;
    //initQueue(&data->queue);
    data->time = 0.0f;
    data->inUse = false;
}

void portamento_init(Portamento *porta, PortamentoData *data) {
    porta->portamentoData = data;
    porta->lowestTime = 0.0001f;
    porta->lowestLevel = 0.0000001f;
    porta->v0 = porta->lowestLevel;
    porta->v1 = porta->lowestLevel;
    porta->frequency = porta->lowestLevel;
    porta->targetReached = false;
}

void portamento_set_timing(Portamento *porta, float value, float time) {
    PortamentoData* pd = porta->portamentoData;

    porta->frequency =  pd->previousFrequency != -1.0f ? pd->previousFrequency : value; //dequeue(&porta->portamentoData->queue);  // Get least recent note frequency to start portamento from
    pd->previousFrequency = value;
    if (porta->frequency == -1.0f)
        porta->frequency = value;
    // FIX: Prevent porta->v0 from being 0 or lower than porta->lowestLevel
    float currentLevel = porta->frequency;
    if (currentLevel < porta->lowestLevel) {
        currentLevel = porta->lowestLevel;
    }

    porta->v0 = currentLevel;
    porta->v1 = value + porta->lowestLevel;
    porta->t0 = porta->t;
    porta->t1 = porta->t0 + time + porta->lowestTime;
    porta->targetReached = false;
}

float portamentoGlide(Portamento *porta, float currentFx) {
    porta->t += 1.0f / g_sampleRate;
    if ((porta->t1 - porta->t0) == 0) {
        porta->frequency = porta->v1;
        porta->targetReached = true;
    } else {
        porta->frequency = porta->v0 * powf(porta->v1 / porta->v0, (porta->t - porta->t0) / (porta->t1 - porta->t0));
        if (isnanf(porta->frequency))
            emscripten_console_errorf(
                "NaN returned by powf(porta->v1 / porta->v0, (porta->t - porta->t0) / (porta->t1 - porta->t0) in pitch envelope");
        if (porta->t >= porta->t1 && !porta->targetReached) {
            porta->targetReached = true;
            porta->frequency = porta->v1;
            //enqueue(&porta->portamentoData->queue, porta->frequency);
        }
    }
    return !porta->targetReached ? porta->frequency : currentFx;  // Use current frequency when target reached to allow tuning
}
