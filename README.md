# FM Music Synthesiser
This is a polyphonic music synthesiser which uses features of traditional subtractive synthesis 
using harmonics-rich waveforms run through filters, as well as additive synthesis using FM, or AM modulation.

The synthesiser is a web application using WebAudio. Most of the functionality is in a single audio worklet containing the following:-

* 4 banks of 12 oscillators (for up to 12 note polyphony),
* 4 banks of 12 filters which can be morphed between low and high pass with variable Q. Oscillators each feed into a corresponding filter
 with so that the filter effect on each note is consistent.
* Operator Matrix which enables any oscillator bank to modulate any other, including themselves.
* Phaser which can have between 1 and 61 all pass stages, and has feedback, Q and wet/dry control
* Noise generator which can produce white, pink or brown noise.
* ADSR envelopes for oscillator banks and noise generator.
* Pitch envelope for oscillator banks and filter
* Portamento for oscillator and filter banks 
* Modulator for Oscillator and filter banks (variable between LFO and audio frequencies).
* LFO for Phaser

The audio worklet uses a WebAssembly compiled from C code with Emscripten. 

Additional modules are:-

* Reverb unit which comprises a convolver with adjustable echo attack and decay times and a repeat echo
loop with variable delay and pre-delay.
* Ring modulator.
* Analyser with a graphical display which can show the audio in the time (oscilloscope) or frequency
(spectrum analyser) domains.
 

* It will work with standard USB MIDI keyboards.

The synthesiser may be either run in a browser, or built as an application for Linux or Windows as Electron Desktop apps.

![The Complete synthesiser control panel](README.images/synth.png)

*The Complete synthesiser control panel*

## Running in the development environment
1. Download from GitHub (git clone git@github.com:richard-austin/synthesiser.git) if not already done.
2. cd to project directory
4. cd back to root project directory and type ./gradlew client:bootRun
5. Open another command line terminal and cd to the root project directory.
6. Type ./gradlew server:bootRun
7. Start a browser (preferably a chromium based browser as Firefox does not render the user interface perfectly).
8. Type localhost:4200 in the url box to start the application.

*This will work on Linux or Windows, but you will need to use .\gradlew on Windows*

## Building the project for installation on Linux (Debian/Ubuntu) or Windows
1. Download from GitHub (git clone git@github.com:richard-austin/synthesiser.git) if not already done.
### To build a Windows installer (amd_64)
1. *This must be done from a Windows environment*
2. cd to the project directory 
3. Type .\gradlew electron-desktop-win:buildWindows
#### The installer file will be at projectDir/electron-desktop-win/dist with a name similar to synthesiser-desktop-win Setup 1.0.0.exe
### To build a Debian deb installation file (amd_64)
1. *This must be done from a Linux environment.*
2. cd to project directory
3. Type ./gradlew electron-desktop:buildLinux

#### The installer file will be at projectDir/electron-desktop/dist with a name similar to synthesiser-desktop_1.0.0.deb
A Linux build will also produce an AppImage file which is run directly as an executable and should run on most (amd_64) Linux platforms.
The AppImage file will be named similarly to **synthesiser-desktop-1.0.0.AppImage** and is at the same location as the .deb file.

### Running on any platform
A .jar file is produced at projectDir/server/build/libs named similarly to server-0.0.1-SNAPSHOT.jar, which has an embedded web server
and can be run on any platform with a suitable desktop and running Java 25 or later.
* Move the .jar file to a suitable location.
* Start the server with the command java -jar server-0.0.1-SNAPSHOT.jar
* Ensure your MIDI keyboard is connected.
* Start a browser (preferably a Chromium based browser) and go to the URL localhost:8080.
* The synthesiser application will start in the browser.
* Click the Start button on the start up splash.
* If the browser asks permission to use the MIDI keyboard, click on "Allow".

## Using the synthesiser

### The control dials
The most ubiquitous object on the main panel are the control dials.

<img height="98" alt="Control Dial" src="README.images/control-dial.png" width="100"/>

* To increase or decrease the setting on a control dial, hold the mouse button down and drag up to increase the setting, down to decrease it.
* To set a dial to zero, click on it then press ESC.
* To set a dial to a particular number on the dial, click on the dial so the cursor above it turns red and press the F key matching the required number. 
* Some of the dials have negative settings, To go straight to these, click on the dial so the cursor above it turns red then press the shift key along 
with the appropriate F key. 

### Selecting oscillator/filter banks.
Each bank of oscillators has a corresponding bank of filters. When keys are pressed on the keyboard
a vacant oscillator is selected to play that note* At the same time the filter selected from the 
corresponding bank will be the filter that corresponds to that oscillator, and it will be assigned the same base frequency
as the oscillator.

\* if an oscillator is still actively playing a note just played again (i.e. during the release phase of the envelope)
It will be selected again ahead of any vacant oscillators and retriggered on that note.

* On the Operator Matrix panel, an oscillator/filter bank pair can be selected by clicking on the number of the bank you want 
In either the carriers column or modulators row. 

<img height="356" src="README.images/modulation-matrix.png" width="287.5" title="Modulation Matrix" alt="The controls for setting cross modulation (AM or FM) between oscillator banks."/>

*The operator modulation matrix*

### Module Outputs

Each module has a set of output selector buttons which determine where the output from that module will go to.
The speaker is selected on illustration. 
These are the oscillator output buttons which enable directing the oscillator output to the speaker, filter, 
ring modulator, reverb, phaser or having it set off. Note for the oscillators and filters, each
bank has its own output setting independent of the others.

![](README.images/outputs.png)

*Output Selection*

### Oscillators
There are 4 banks of 12 oscillators giving up to four simultaneous settings with 12 note polyphony on each bank.

<img height="600" src="README.images/oscillator.png" width="353" alt="oscillator bank"/>

*Oscillator bank 1*

#### Main Controls

| Control  | Function                                                                                                                                                                                                                           |
|----------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Tuning   | Centered on zero where middle C will be in the expected place, this tunes the frequency up or down from nominal by up to 3 octaves. The dial numbers represent octaves up or down The resolution of course is finer than octaves. |
| Detune   | Centred on zero where there is no offset, the dial scale allows detune by up to + or - 12 semitones                                                                                                                                |
| Gain     | Set the output level to between zero and 100% of full output.                                                                                                                                                                     |
| Balance  | Adjust the left/right balance of the output. Note that this also applies to the filters in the same bank. The phaser and noise output balance is set by the  balance control on oscillator bank 1.                                 |
| Waveform | This is a drop down control allowing the selection of waveform for the oscillator output                                                                                                                                           |
| Output   | Select output target for the oscillator bank (Sere module outputs above)                                                                                                                                                           |

#### Oscillator Modulation

| Control    | Function                                                                                                                                       |
|------------|------------------------------------------------------------------------------------------------------------------------------------------------|
| Mod Freq   | Frequency of the modulator. This works over a fairly wide range with an exponential law enabling it to range from an LFO to an audio modulator |
| Mod Depth  | Modulation gain                                                                                                                                |
| Waveform   | Select modulation waveform from sine, square sawtooth or triangular waves.                                                                     |
| Modulation | Select type from amplitude, frequency or off (none)                                                                                            |

#### Modulation output

This does not relate to the modulation from the modulating LFO/oscillator described above, but to the output of
the main oscillator when selected as a modulator in the Operator Matrix.

| Setting  | Result                                                                                                                                           |
|----------|--------------------------------------------------------------------------------------------------------------------------------------------------|
| Direct   | The oscillator output is applied for modulation without envelope shaping, i.e. at the contant level selected by the dial on the operator matrix. |
| Envelope | The oscillator output is time dependent as set by the ADSR envelope, with overall modulation gain set by the dial on the operator matrix         |


#### Portamento
This function is limited at the moment, and just gives a glide between the previous note and the next. Set to zero, there is no portamento.
The drop down below it is from an earlier version and currently does nothing.

#### Envelope

This is a standard ADSR envelope shaper.
#### Legato
If legato mode is on, pressing a key will cause the envelope to rise to 100% and remain there for the decay time.
Holding the key down will sustain this. After the decay time has elapsed, the note will tail off in accordance with the release timing.
#### Velocity Sens
Enable/disable velocity sensitivity.
#### Freq Envelope
The pitch envelope is used to bend the pitch over time as the envelope does with output amplitude.
There are two additional controls as compared with the amplitude envelope, Attack Level and Release Level.
When the pitch envelope is set on the sequence is as follows:-
* The pitch starts at the release level when the key is pressed.
* The pitch will change from the release level to the attack level at a rate determined by the attack time. If the key is released before the attack level is reached, the pitch will return to the release level at a rate determined by the release time.
* When the attack level is reached the pitch will then start to change to the sustain level at a rate determined by the decay setting.
* The pitch will remain at the sustain level until the key is released.
* On key release the pitch will change to the release level at a rate determined by the release setting.

The attack, sustain and release levels calibration is such that 3 is + 1 octave -3 is - 1 octave etc.
### Filters
There are four banks of 12 filters, each one in a bank corresponding to the same numbered oscillator in the same bank,
so each oscillator has a single filter tuned proportionally to the corresponding oscillators frequency.

Each of the (total 48) filters is a 4 pole state variable filter which can morph between low and high pass.
They have a Q control which can change the response from fairly flat in the passband to sharply peaking to 
the point of oscillating.

<img height="608" alt="Filter" src="README.images/filter.png" width="328"/>

#### Main Controls
| Control  | Function                                                                                                                                                                                                                                                    |
|----------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Tuning   | Centered on zero where cutoff frequency corresponds to the oscillator frequency at zero, this tunes the frequency up or down from nominal by up to 3 octaves. The dial numbers represent octaves up or down The resolution of course is finer than octaves. |
| Detune   | Centred on zero where there is no offset, the dial scale allows detune by up to + or - 12 semitones                                                                                                                                                         |
| Q Factor | Adjust the sharpness of the peak at cutoff frequency.                                                                                                                                                                                                       |
| Gain     | Set the output level to between zero and 100% of full output.                                                                                                                                                                                               |


#### Portamento
This function is limited at the moment, and just gives a glide between the previous note and the next. Set to zero, there is no portamento.
The drop down below it is from an earlier version and currently does nothing.

#### Filter Morph Mode
Five buttons which set the filter response in steps between low pass and high pass.

#### Output
Five Buttons which are used to set the filter output for the bank to speaker, ring modulator, phaser, 
reverb or off.

#### Filter Modulation

| Control    | Function                                                                                                                                       |
|------------|------------------------------------------------------------------------------------------------------------------------------------------------|
| LFO Frequency   | Frequency of the modulator. This works over a fairly wide range with an exponential law enabling it to range from an LFO to an audio modulator |
| Mod Depth  | Modulation gain                                                                                                                                |
| Waveform   | Select modulation waveform from sine, square sawtooth or triangular waves.                                                                     |
| Modulation | Select type from frequency or off (none)                                                                                            |

#### Freq Envelope
The pitch envelope is used to bend the cutoff frequency over time as the oscillator envelope does with output amplitude.
There are two additional controls as compared with the amplitude envelope, Attack Level and Release Level.
When the pitch envelope is set on the sequence is as follows:-
* The cutoff frequency starts at the release level when the key is pressed.
* The cutoff frequency  will change from the release level to the attack level at a rate determined by the attack time. If the key is released before the attack level is reached, the pitch will return to the release level at a rate determined by the release time.
* When the attack level is reached the pitch will then start to change to the sustain level at a rate determined by the decay setting.
* The cutoff frequency  will remain at the sustain level until the key is released.
* On key release the cutoff frequency  will change to the release level at a rate determined by the release setting.

### Operator Matrix
The operator matrix enables setting any oscillator bank as a modulator for any other oscillator bank, including itself.

<img height="500" src="README.images/operator-matrix2.png" alt="operator matrix in use" width="400"/>

*Operator Matrix with oscillator bank 2 frequency modulating bank 1 at level 7.8 and oscillator bank 3 amplitude modulation bank 2 at level 3.9*

When amplitude modulation (AM) is selected, the level dial goes purple and if frequency modulation (FM)
is selected, the dial goes red. To modulate bank A with bank B, select the modulation type (AM or FM) on the control
in row B and column A. Ensure that the carrier bank selected is going to the output you want (click on the modulator or carrier bank
number in the operator matrix to select that bank). You can then press keys and adjust the modulation level for the sound you want.
Modulators don't have to have their output  going anywhere, they will still modulate, but they can optionally be audible themselves.

The relative frequencies of modulators and carriers are important so as not to have a very harsh sounding result!

### Noise Generator

<img height="500" src="README.images/noise.png" alt="Noise Generator" width="276"/>

The noise generator is a white, pink or brown noise generator with amplitude envelope controlled output. The output
can be to speaker, filter, reverb phaser of off. The amplitude envelope is a standard ADRS envelope as used in the oscillator banks.
When Filter is selected for output, this will be filter bank 1, it cannot connect to other filter banks.

### Ring Modulator

<img height="500" src="README.images/ring-mod.png" width="196" alt="ring mod"/>

The ring modulator is a AM modulator with the modulation frequency set from a dial and not tracking the oscillator 
banks. This gives rise to dissonant sounds unlike when using the modulation matrix where modulator and carrier track each other.

#### Controls

| Control             | Function                                                                                       |
|---------------------|------------------------------------------------------------------------------------------------|
| Mod Freqs           | Sets the modulation frequency. This frequency is not affected by the Midi keyboard             |
| Mod Depth           | The amplitude of the modulation signal                                                         |
| Waveform            | Select modulating waveform from Sine, Square, Sawtooth, or Triangle                            |
| Internal Modulation | Sets the modulating oscillator on or off. When off, no sound will come from the ring modulator |
| Output              | Set where the ring modulator feeds to out of speaker, filter, reverb or off                    |

### Reverb

<img src="README.images/reverb.png" alt="reverb"/>

The reverb unit consists of a convolver and delay module with a variable repeat loop. The two parts work in parallel, so
adjustments to the convolver will not affect the delay line and vice versa. Additionally there is a pre-delay line which
sits in front to the convolver and repeat echo delay line.

The convolver uses a white noise attack and decay cycle as the refence impulse. 

To prevent output from the convolver, set attack time and decay time to zero. To prevent output from the delay line,
set repeat level to zero.

| Control             | Function                                                                                                                                                                        |
|---------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Attack Time         | Sets the attack time of the convolver reference impulse.                                                                                                                        |
| Decay Time          | Sets the decay time of the convolver reference impulse.                                                                                                                         |
| Wet Dry             | This applies to both the convolver and delay line. Adjust between fully wet at -5 (all output from convolver and delay line), to fully dry at 5 (all output direct from input). |
| Pre Delay           | The amount of delay on the signal going to the repeat echo line and/or convolver.                                                                                               |
| Repeat Time         | The amount of time between echo repeats                                                                                                                                         |
| Repeat Level        | The level of feedback from the repeat echo loop output back to the input. If set to zero, the output is muted, at 10 the repeat echo continues indefinitely                      |
| Speaker/Off buttons | The output of the reverb unit can either go to the speaker or be off                                                                                                            |

### Phaser
<img src="README.images/phaser.png" alt="phaser"/>

The phaser provides the classic sweeping phasing sound, working best with harmonics-rich sources.  It has a variable number of
stages which can be between 1 and 61,

| Control                       | Function                                                                                                                                                                                                                                                  |
|-------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Frequency                     | Sets the cutoff frequency of the filter stages. Note that the LFO varies the cutoff frequency between the value set on this control and lower values dependent on the modulation depth.                                                                   |
| Gain                          | The phaser output level.                                                                                                                                                                                                                                  |
| Wet/Dry                       | Mixes the input and filter chain output between all input at -5 and all filter chain output at 5. The strongest phasing effect is at zero where they are equal.                                                                                           |
| Q                             | The Q factor of the filter stages. The higher the Q, the sharper the phase transition will be                                                                                                                                                             |
| Feedback                      | Variable between 5 (full positive feedback where oscillation will occur) zero (no feedback) and -5 (full negative feedback where oscillation will occur)                                                                                                  |
| Speaker/Reverb/Off            | Set the phaser output to the speaker, the reverb unit or off                                                                                                                                                                                              |
| LFO Frequency                 | The LFO gives a continuous up/down sweep of trhe phaser cutoff frequency, LFO frequency sets the rate of this change.                                                                                                                                     |
| Mod Depth                     | The amount of effect on the cutoff frequency the modulator will have. Note that this LFO only modulates the cutoff frequncy **down**. The cutoff frequency will vary between the cutoff set by the Frequency dial down to a level determined by Mod Depth |
| Sine/Square/Sawtooth/Triangle | The LFO waveform.                                                                                                                                                                                                                                         |
| On/Off                        | Sets the LFO on or off.                                                                                                                                                                                                                                   |


### General

<img height="300" src="README.images/general.png" width="248" alt="general"/>

#### General functions

* Save the current configuration to a file, including updating existing configurations by making adjustments then saving under the same name.
* Load a saved configuration to the synthesiser.
* Rename a configuration.
* Delete a configuration.

###### Save configuration

* Click on Save Configuration on the General module

<img height="" src="README.images/save-config.png" width="" alt="save-config"/>

* Enter or edit the config file name (leave the same if updating a configuration)
* Click on Confirm to save or Cancel to back out.

###### Load Configuration
* Click on Load or Manage Config Files

![](README.images/select.png)

* Click on Select Configuration to show the available configuration files in a drop down list.
* Select the required config file.
 
![](README.images/selected.png)

* Click on Load Selected Configuration, or to back out, click on Cancel.

###### Delete Configuration

* Click on Load or Manage Config Files on the General Module.
* Click on Select Configuration to show the available configuration files in a drop down list.
* Select the required config file.
* Click on Delete Selected Configuration

![](README.images/delete.png)
* Click on Delete Selected Configuration, or to back out, click on Cancel.

###### Rename Configuration

* Click on Load or Manage Config Files on the General Module.
* Click on Select Configuration to show the available configuration files in a drop down list.
* Select the required config file.
* Click in Rename Selected Configuration.

![](README.images/rename.png)
* Type in the required new name and click Confirm rename, or to back out click on Cancel.

### Analyser

![](README.images/analyser.png)

*Analyser in oscilloscope mode*

The analyser gives a view of the sound output of the synthesiser in the time domain (oscilloscope) or frequency domain
(spectrum analyser).
* With oscilloscope selected, the TrigLevel, Y Scale and X Scale controls are displayed. These work just as on a
conventional oscilloscope.

![](README.images/spectrum.png)

*Analyser in spectrum analyser mode*
