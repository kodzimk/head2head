# Battle Countdown Audio Files

This directory contains audio files for the battle countdown timers.

## Files

- `countdown-tick.mp3` - Short tick sound played during countdown (recommended: 100-200ms duration)
- `countdown-go.mp3` - Final "go" sound when countdown reaches zero (recommended: 500-1000ms duration)

## Usage

These audio files are used in:
- `src/modules/battle/countdown.tsx` - Main battle countdown
- `src/modules/battle/quiz-question.tsx` - Next question countdown

## Audio Specifications

### countdown-tick.mp3
- **Duration**: 100-200ms
- **Type**: Short, sharp beep or click sound
- **Purpose**: Played for each countdown number (3, 2, 1)
- **Format**: MP3 recommended for web compatibility

### countdown-go.mp3
- **Duration**: 500-1000ms
- **Type**: Longer, more dramatic sound
- **Purpose**: Played when countdown reaches zero to signal start
- **Format**: MP3 recommended for web compatibility

## Replacing Audio Files

1. Create your audio files with the specifications above
2. Replace the placeholder files in this directory
3. Ensure the files are named exactly as shown above
4. Test the audio in the application

## Audio Sources

You can find free countdown sounds from:
- Freesound.org
- Zapsplat.com
- SoundBible.com
- Or create your own using audio editing software

## Browser Compatibility

The audio files use the HTML5 `<audio>` element with MP3 format for maximum browser compatibility. 