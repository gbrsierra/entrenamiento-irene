/**
 * VoiceRepCounter
 * Escucha los números que el usuario dice en voz alta y
 * cuenta las repeticiones automáticamente usando la Web Speech API.
 *
 * Flujo:
 *  1. Usuario pulsa el botón de micrófono -> empieza a escuchar.
 *  2. Dice los números: "uno", "dos"... o "1", "2"...
 *  3. Al alcanzar el nº objetivo de reps -> llama a onSetComplete().
 *  4. El WorkoutPlayer inicia el descanso y, al acabar, llama a
 *     startNewSet() para reiniciar el contador con la siguiente serie.
 */
export class VoiceRepCounter {
  constructor({ onSetComplete, onRep } = {}) {
    this.onSetComplete = onSetComplete || (() => {});
    this.onRep = onRep || (() => {});

    this.targetReps = 0;
    this.currentCount = 0;
    this.isListening = false;
    this.isEnabled = false;
    this.setLabel = '';

    this._recognition = null;
    this._panelEl = null;
    this._transcriptEl = null;
    this._countNumberEl = null;
    this._repsFillEl = null;
    this._countTargetEl = null;
    this._flashEl = null;
    this._micBtnEl = null;
    this._restartTimeout = null;

    this._wordMap = this._buildWordMap();
    this._initSpeechRecognition();
    this._createFloatingPanel();
    this._createCompleteFlash();
  }

  _buildWordMap() {
    return {
      'uno': 1, 'dos': 2, 'tres': 3, 'cuatro': 4, 'cinco': 5,
      'seis': 6, 'siete': 7, 'ocho': 8, 'nueve': 9, 'diez': 10,
      'once': 11, 'doce': 12, 'trece': 13, 'catorce': 14, 'quince': 15,
      'dieciseis': 16, 'diecisiete': 17, 'dieciocho': 18, 'diecinueve': 19, 'veinte': 20,
      'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
      'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
      'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14,
      'fifteen': 15, 'sixteen': 16, 'seventeen': 17, 'eighteen': 18,
      'nineteen': 19, 'twenty': 20,
    };
  }

  _initSpeechRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { console.warn('[VoiceRepCounter] Web Speech API no disponible.'); return; }

    this._recognition = new SR();
    this._recognition.lang = 'es-ES';
    this._recognition.continuous = true;
    this._recognition.interimResults = true;
    this._recognition.maxAlternatives = 5;

    this._recognition.onresult = (event) => this._handleResult(event);
    this._recognition.onerror = (event) => {
      if (event.error === 'no-speech' || event.error === 'audio-capture') {
        this._scheduleRestart();
      } else if (event.error === 'not-allowed') {
        this._showTranscript('Permiso de microfono denegado');
        this.disable();
      }
    };
    this._recognition.onend = () => {
      if (this.isListening) this._scheduleRestart();
    };
  }

  _handleResult(event) {
    const result = event.results[event.results.length - 1];
    if (!result) return;
    const isFinal = result.isFinal;

    // Recoger TODAS las alternativas (maxAlternatives = 5)
    const transcripts = [];
    for (let i = 0; i < result.length; i++) {
      transcripts.push(result[i].transcript.trim().toLowerCase());
    }
    const combined = transcripts.join(' ');
    this._showTranscript('"' + transcripts[0] + '"');

    // Detectar "YA" en cualquier alternativa (interim o final)
    // Se verifica en cada alternativa por separado para mayor fiabilidad
    for (const t of transcripts) {
      if (this._isYaCommand(t)) {
        this._onYaDetected();
        return;
      }
    }

    if (!isFinal) return;
    const detectedNumber = this._extractNumber(combined);
    if (detectedNumber !== null) this._onVoiceNumber(detectedNumber);
  }

  _isYaCommand(text) {
    if (!text) return false;
    // Normalizar: minúsculas, quitar acentos, quitar puntuación
    const clean = text
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .trim();

    // Palabras exactas que significan "he terminado la serie"
    const triggerWords = ['ya', 'ja', 'yaa', 'ya ya', 'listo', 'hecho', 'terminado',
      'termine', 'fin', 'completado', 'ready', 'done', 'vamos', 'venga', 'dale'];
    
    const words = clean.split(/\s+/);
    for (const trigger of triggerWords) {
      if (trigger.includes(' ')) {
        if (clean.includes(trigger)) return true;
      } else {
        if (words.includes(trigger)) return true;
      }
    }

    // Frases compuestas
    if (clean.includes('ya esta') || clean.includes('ya termine') ||
        clean.includes('ya ta') || clean.includes('ya fue') ||
        clean.includes('ya listo') || clean.includes('ya acabe') ||
        clean.includes('ya acabe') || clean.includes('ya acabo')) {
      return true;
    }

    // Variante: solo "a" o "ga" que a veces transcribe el motor como "ya"
    if (words.length === 1 && (words[0] === 'a' || words[0] === 'ga' || words[0] === 'ia')) {
      return false; // demasiado ambiguo
    }

    return false;
  }

  _onYaDetected() {
    if (!this.isListening || this._isTransitioning) return;
    this._isTransitioning = true;
    this._showTranscript('¡YA! Serie completada ✓');
    if (this.targetReps > 0) {
      this.currentCount = this.targetReps;
    } else {
      this.currentCount = Math.max(1, this.currentCount);
    }
    this._updateCountDisplay();
    this._onTargetReached();
  }

  _extractNumber(text) {
    const digitMatch = text.match(/\b(\d+)\b/);
    if (digitMatch) return parseInt(digitMatch[1], 10);
    const words = text.split(/\s+/);
    for (const word of words) {
      const clean = word.replace(/[^a-z\u00e0-\u00ff]/gi, '');
      if (this._wordMap[clean] !== undefined) return this._wordMap[clean];
    }
    return null;
  }

  _onVoiceNumber(num) {
    if (!this.isListening || this._isTransitioning || this.currentCount >= this.targetReps) return;
    const expected = this.currentCount + 1;
    if (num === expected || (num > this.currentCount && num <= this.targetReps)) {
      this.currentCount = num;
      this._updateCountDisplay();
      this.onRep(this.currentCount);
      if (this.currentCount >= this.targetReps) this._onTargetReached();
    }
  }

  _onTargetReached() {
    this._stopListening();
    this._markComplete();
    this._showCompleteFlash();
    setTimeout(() => {
      this._isTransitioning = false;
      this.onSetComplete();
    }, 550);
  }

  // ---- API publica ----

  startNewSet(targetReps, label) {
    this._isTransitioning = false;
    this.targetReps = targetReps;
    this.currentCount = 0;
    this.setLabel = label || '';
    this._updateCountDisplay();
    if (this._transcriptEl) this._showTranscript('Escuchando... Di "YA" al terminar');
    if (this.isEnabled && !this.isListening) {
      this._startListening();
    }
  }

  enable() {
    if (!this._recognition) return;
    this.isEnabled = true;
    this._showPanel(true);
    this._startListening();
  }

  disable() {
    this.isEnabled = false;
    this._isTransitioning = false;
    this._stopListening();
    this._showPanel(false);
    if (this._micBtnEl) {
      this._micBtnEl.classList.remove('is-listening');
      const lbl = this._micBtnEl.querySelector('.mic-btn-label');
      if (lbl) lbl.textContent = 'Voz OFF';
    }
  }

  pause() { this._stopListening(); }

  resume() {
    if (!this.isEnabled) return;
    this.currentCount = 0;
    this._updateCountDisplay();
    this._startListening();
  }

  static isSupported() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  destroy() {
    this._stopListening();
    if (this._panelEl) this._panelEl.remove();
    if (this._flashEl) this._flashEl.remove();
  }

  // ---- Escucha ----

  _startListening() {
    if (!this._recognition || this.isListening) return;
    try {
      this.isListening = true;
      this._recognition.start();
      if (this._micBtnEl) this._micBtnEl.classList.add('is-listening');
      document.querySelectorAll('.sets-row.is-current').forEach(r => r.classList.add('voice-active'));
    } catch (e) {}
  }

  _stopListening() {
    if (this._restartTimeout) { clearTimeout(this._restartTimeout); this._restartTimeout = null; }
    this.isListening = false;
    if (this._recognition) { try { this._recognition.stop(); } catch (_) {} }
    if (this._micBtnEl) this._micBtnEl.classList.remove('is-listening');
    document.querySelectorAll('.sets-row.voice-active').forEach(r => r.classList.remove('voice-active'));
  }

  _scheduleRestart() {
    if (!this.isListening || !this.isEnabled || this._restartTimeout) return;
    this._restartTimeout = setTimeout(() => {
      this._restartTimeout = null;
      if (this.isListening && this._recognition) { try { this._recognition.start(); } catch (_) {} }
    }, 300);
  }

  // ---- UI ----

  _createFloatingPanel() {
    const panel = document.createElement('div');
    panel.className = 'voice-counter-panel';
    panel.id = 'voice-counter-panel';
    panel.innerHTML = `
      <div class="voice-transcript-toast" id="voice-transcript-toast">Listo • Di "YA" al terminar</div>
      <div class="voice-count-bubble">
        <div class="voice-waveform" id="voice-waveform">
          <span></span><span></span><span></span><span></span><span></span>
        </div>
        <div class="voice-count-number" id="voice-count-number">0</div>
        <div class="voice-count-info">
          <span class="voice-count-label">DI "YA" AL COMPLETAR</span>
          <span class="voice-count-target" id="voice-count-target">— / —</span>
          <div class="voice-reps-bar">
            <div class="voice-reps-fill" id="voice-reps-fill"></div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(panel);

    this._panelEl = panel;
    this._transcriptEl = document.getElementById('voice-transcript-toast');
    this._countNumberEl = document.getElementById('voice-count-number');
    this._repsFillEl = document.getElementById('voice-reps-fill');
    this._countTargetEl = document.getElementById('voice-count-target');
  }

  _createCompleteFlash() {
    const el = document.createElement('div');
    el.className = 'voice-complete-flash';
    el.id = 'voice-complete-flash';
    el.innerHTML = '<span class="voice-complete-flash-text">Serie lista!</span>';
    document.body.appendChild(el);
    this._flashEl = el;
  }

  _showPanel(visible) {
    if (this._panelEl) this._panelEl.classList.toggle('is-visible', visible);
  }

  _updateCountDisplay() {
    if (this._countNumberEl) {
      this._countNumberEl.textContent = this.currentCount;
      this._countNumberEl.classList.remove('pop', 'complete');
      void this._countNumberEl.offsetWidth;
      if (this.currentCount >= this.targetReps && this.targetReps > 0) {
        this._countNumberEl.classList.add('complete');
      } else if (this.currentCount > 0) {
        this._countNumberEl.classList.add('pop');
        setTimeout(() => { if(this._countNumberEl) this._countNumberEl.classList.remove('pop'); }, 220);
      }
    }
    if (this._countTargetEl) {
      const label = this.setLabel ? '  ' + this.setLabel : '';
      this._countTargetEl.textContent = this.currentCount + ' / ' + this.targetReps + label;
    }
    if (this._repsFillEl && this.targetReps > 0) {
      const pct = Math.min(100, (this.currentCount / this.targetReps) * 100);
      this._repsFillEl.style.width = pct + '%';
    }
  }

  _showTranscript(text) {
    if (this._transcriptEl) this._transcriptEl.textContent = text;
  }

  _markComplete() {
    if (this._countNumberEl) {
      this._countNumberEl.classList.remove('pop');
      this._countNumberEl.classList.add('complete');
    }
    if (this._repsFillEl) this._repsFillEl.style.width = '100%';
    this._showTranscript('Objetivo alcanzado!');
  }

  _showCompleteFlash() {
    if (!this._flashEl) return;
    this._flashEl.classList.remove('show');
    void this._flashEl.offsetWidth;
    this._flashEl.classList.add('show');
    setTimeout(() => { if(this._flashEl) this._flashEl.classList.remove('show'); }, 800);
  }

  /**
   * Crea el boton de microfono para insertar en el header de series.
   * @param {function} onToggle - Callback(isNowEnabled: bool)
   */
  createMicButton(onToggle) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'voice-mic-btn';
    btn.id = 'btn-voice-mic';
    btn.setAttribute('aria-label', 'Activar contador de voz');
    btn.innerHTML = `
      <svg class="mic-icon-static" viewBox="0 0 24 24" width="16" height="16"
           fill="none" stroke="currentColor" stroke-width="2">
        <rect x="9" y="2" width="6" height="11" rx="3"/>
        <path d="M19 10a7 7 0 0 1-14 0"/>
        <line x1="12" y1="19" x2="12" y2="22"/>
        <line x1="8" y1="22" x2="16" y2="22"/>
      </svg>
      <svg class="mic-icon-wave" viewBox="0 0 24 24" width="16" height="16"
           fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        <line x1="12" y1="19" x2="12" y2="22"/>
        <line x1="8" y1="22" x2="16" y2="22"/>
      </svg>
      <span class="mic-btn-label">Voz OFF</span>
    `;

    btn.onclick = () => {
      if (this.isEnabled) {
        this.disable();
      } else {
        this.enable();
        btn.querySelector('.mic-btn-label').textContent = 'Voz ON';
      }
      if (onToggle) onToggle(this.isEnabled);
    };

    this._micBtnEl = btn;
    return btn;
  }
}
