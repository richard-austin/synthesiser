#include <stdbool.h>
#include "globals.h"

#ifndef PORTAMENTO_H
#define PORTAMENTO_H

#ifndef CAPACITY
#define CAPACITY 12
#endif

// Initialize the queue
void initQueue(CircularQueue *q);

// Check if the queue is full
bool isFull(CircularQueue *q);

// Check if the queue is empty
bool isEmpty(CircularQueue *q);

// Add an element to the rear of the queue (Enqueue)
bool enqueue(CircularQueue *q, float value);

// Remove and return the front element of the queue (Dequeue)
float dequeue(CircularQueue *q);

int queueSize(CircularQueue *q);

// View the front element without removing it (Peek)
float peek(CircularQueue *q);

void initPortamentoData(PortamentoData *data);

void portamento_init(Portamento *porta, PortamentoData *data);

void portamento_set_timing(Portamento *porta, float value, float time);

float portamentoGlide(Portamento *porta);


#endif
