package main

import (
	"math"
)

// Configurations and Constants
const MaxWaveTableSize = 2048
const MaxBands = 64
const SampleBlockSize = 128

// Filter state variables
var x1, x2, y1, y2 float32
var b0, b1, b2, a1, a2 float32

// Oscillator state variables
var phase float32 = 0.0
var lastDetune float32 = 0.0
var detuneFactor float32 = 1.0
var sampleRate float32 = 44100.0
var nyquist float32 = 22050.0
var startFx float32 = 20.0
var waveTableSize int32 = 2048

// Memory buffers accessible from JS
var inputBuffer [SampleBlockSize]float32
var outputBuffer [SampleBlockSize]float32
var freqBuffer [SampleBlockSize]float32
var detuneBuffer [SampleBlockSize]float32

// Wave table storage matrix: [band][index]
var waveTables [MaxBands][MaxWaveTableSize]float32
var activeBands int32 = 0
var usePeriodicWave bool = false

// Constants for math conversion
const twelfthRoot2 = 1.0594630943592953
const root2 = 1.4142135623730951

//export initProcessor
func initProcessor(sRate float32, startF float32, wTableSize int32) {
	sampleRate = sRate
	nyquist = sRate / 2.0
	startFx = startF
	waveTableSize = wTableSize
	phase = 0.0
	lastDetune = 0.0
	detuneFactor = 1.0
	usePeriodicWave = false
}

//export calculateCoefficients
func calculateCoefficients(cutoff float32) {
	omega := math.Pi * float64(cutoff) / float64(sampleRate)
	tanVal := math.Tan(omega)
	c2 := tanVal * tanVal
	a0 := 1.0 + math.Sqrt2*tanVal + c2

	b0 = float32(c2 / a0)
	b1 = float32(2.0 * c2 / a0)
	b2 = float32(c2 / a0)
	a1 = float32(2.0 * (c2 - 1.0) / a0)
	a2 = float32((1.0 - math.Sqrt2*tanVal + c2) / a0)
}

//export setWaveTableBand
func setWaveTableBand(band int32, index int32, value float32) {
	if band < MaxBands && index < MaxWaveTableSize {
		waveTables[band][index] = value
		if band >= activeBands {
			activeBands = band + 1
		}
	}
}

//export setUsePeriodicWave
func setUsePeriodicWave(status bool) {
	usePeriodicWave = status
}

//export getInputBufferPtr
func getInputBufferPtr() *float32 { return &inputBuffer[0] }

//export getOutputBufferPtr
func getOutputBufferPtr() *float32 { return &outputBuffer[0] }

//export getFreqBufferPtr
func getFreqBufferPtr() *float32 { return &freqBuffer[0] }

//export getDetuneBufferPtr
func getDetuneBufferPtr() *float32 { return &detuneBuffer[0] }

//export processBlock
func processBlock(modLen int32, freqLen int32, detuneLen int32, blockSize int32) {
	for i := range blockSize {
		// 1. Get Frequency
		var f float32
		if freqLen == 1 {
			f = freqBuffer[0]
		} else {
			f = freqBuffer[i]
		}
		if f > nyquist {
			f = nyquist
		}

		// 2. Select Band
		var band int32 = 0
		if usePeriodicWave && activeBands > 0 {
			band = int32(math.Floor(math.Log2(float64(f/startFx)) / math.Log2(root2)))
			if band < 0 {
				band = 0
			} else if band > activeBands-1 {
				band = activeBands - 1
			}
		}

		// 3. Handle Detune
		var detune float32
		if detuneLen == 1 {
			detune = detuneBuffer[0]
		} else {
			detune = detuneBuffer[i]
		}
		if detune != lastDetune {
			lastDetune = detune
			detuneFactor = float32(math.Pow(twelfthRoot2, float64(detune/100.0)))
		}
		f *= detuneFactor

		// 4. Filter Phase Mod Input
		var x float32
		if modLen == 1 {
			x = inputBuffer[0] * 10.0
		} else {
			x = inputBuffer[i] * 10.0
		}

		// Biquad Difference Equation
		mod := b0*x + b1*x1 + b2*x2 - a1*y1 - a2*y2
		x2 = x1
		x1 = x
		y2 = y1
		y1 = mod

		// 5. Oscillator Wave Generation
		inc := f / sampleRate
		phase += inc

		currentPhase := phase + mod
		currentPhase = currentPhase - float32(math.Floor(float64(currentPhase)))
		phase = phase - float32(math.Floor(float64(phase)))

		if usePeriodicWave {
			tableIdx := int32(math.Floor(float64(currentPhase * float32(waveTableSize))))
			if tableIdx >= waveTableSize {
				tableIdx = waveTableSize - 1
			}
			outputBuffer[i] = waveTables[band][tableIdx]
		} else {
			outputBuffer[i] = float32(math.Sin(float64(currentPhase * 2.0 * math.Pi)))
		}
	}
}

func main() {}
