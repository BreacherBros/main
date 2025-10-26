import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js';

export class AudioManager {
    constructor(listener){
        this.listener = listener;
        this.sounds = {};
    }

    load(name, url){
        const audio = new Audio(url);
        this.sounds[name] = audio;
    }

    play(name){
        if(this.sounds[name]) this.sounds[name].play();
    }
}
