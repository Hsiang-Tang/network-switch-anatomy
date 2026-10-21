#!/bin/sh
# Adds the score to the silent cut: film/network-switch.mp4 (silent, from render.mjs) -> network-switch-anatomy.mp4
set -e
cd "$(dirname "$0")"
D=$(ffprobe -v error -show_entries format=duration -of csv=p=0 network-switch.mp4)
python3 -I music.py ../.render/score.wav "$D"
ffmpeg -y -loglevel error -i ../.render/score.wav -af "aecho=0.8:0.6:60|120|240:0.30|0.22|0.15,lowpass=f=9000,loudnorm=I=-18:TP=-2" -ar 48000 ../.render/score-fx.wav
ffmpeg -y -loglevel error -i network-switch.mp4 -i ../.render/score-fx.wav -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart ../network-switch-anatomy.mp4
