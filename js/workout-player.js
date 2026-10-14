// Reproductor interactivo de entrenamiento guiado con mancuernas
import { EXERCISES, MUSCLE_GROUPS } from './exercises-data.js?v=8';
import { MuscleMap } from './muscle-map.js?v=8';
import { ExerciseAnimationRenderer } from './animations-render.js?v=8';
import { StorageManager } from './storage.js?v=8';
import { VoiceRepCounter } from './voice-rep-counter.js?v=8';


class AudioFeedback {

  static init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  static playBeep(freq = 440, duration = 0.12, type = 'sine') {
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      console.warn('Audio no disponible', e);
    }
  }

  // Pitido de cuenta atrás (3, 2, 1)
  static playCountdownBeep() {
    this.playBeep(587.33, 0.15, 'sine'); // D5
  }

  // Sonido de inicio de serie
  static playGoBeep() {
    this.playBeep(880, 0.35, 'triangle'); // A5
  }

  // Sonido de fin de entrenamiento
  static playVictoryFanfare() {
    try {
      this.init();
      if (!this.ctx) return;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        setTimeout(() => {
          this.playBeep(freq, 0.25, 'triangle');
        }, idx * 160);
      });
    } catch (e) {
      console.warn('Audio no disponible', e);
    }
  }
}
AudioFeedback.ctx = null; // Safari compat: static class fields not supported in older Safari

export class WorkoutPlayer {
  constructor({ onFinish, onExit } = {}) {

    this.onFinish = onFinish || (() => {});
    this.onExit = onExit || (() => {});

    this.routine = null;
    this.currentExerciseIndex = 0;
    this.currentSetIndex = 0;
    this.exerciseSetsData = []; // [{ sets: [{ weight, reps, completed: bool }] }]
    this.startTime = null;
    this.workoutTimerInterval = null;
    this.restTimerInterval = null;
    this.restSecondsRemaining = 0;
    this.restTotalSeconds = 60;
    this.isResting = false;

    this.container = null;
    this.voiceCounter = null;  // Contador de repeticiones por voz
    this.activeTrackingMode = 'manual'; // 'voice', 'manual'
    this.exerciseTimerInterval = null;
    this.exerciseTimerSecondsRemaining = 0;
    this.isExerciseTimerRunning = false;
  }


  formatTime(seconds) {
    const sec = Math.max(0, parseInt(seconds, 10) || 0);
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  /**
   * Inicia el reproductor con una rutina dada
   */
  start(routine) {
    this.routine = routine;
    this.currentExerciseIndex = 0;
    this.currentSetIndex = 0;
    this.startTime = Date.now();
    this.isResting = false;
    this.stopExerciseTimer();

    // Inicializar matriz de series por ejercicio
    this.exerciseSetsData = routine.exercises.map(exItem => {
      const exDetail = EXERCISES.find(e => e.id === exItem.exerciseId) || {};
      const lastWeight = StorageManager.getLastWeightForExercise(exItem.exerciseId);
      const targetSets = exItem.sets || exDetail.defaultSets || 3;
      const targetReps = exItem.reps || exDetail.defaultReps || 10;
      const isTimer = !!exDetail.isTimer;

      const sets = [];
      for (let i = 0; i < targetSets; i++) {
        sets.push({
          setNumber: i + 1,
          weight: isTimer ? 0 : lastWeight,
          reps: targetReps,
          completed: false
        });
      }

      return {
        exerciseId: exItem.exerciseId,
        exercise: exDetail,
        restSeconds: exItem.restSeconds || exDetail.defaultRest || 60,
        isTimer: isTimer,
        sets
      };
    });

    // Inicializar contador de voz
    if (VoiceRepCounter.isSupported()) {
      this.voiceCounter = new VoiceRepCounter({
        onSetComplete: () => {
          if (!this.isResting && this.currentSetIndex < this._currentSetsData().length) {
            this.completeSetAndRest(this.currentSetIndex);
          }
        },
        onRep: (count) => {
          console.log('[Voz] Rep #' + count);
        }
      });
    }


    this.renderContainer();
    this.startGlobalTimer();
  }

  switchTrackingMode(mode) {
    this.activeTrackingMode = mode;
    const currentItem = this.exerciseSetsData[this.currentExerciseIndex];
    if (!currentItem) return;

    const currentSet = currentItem.sets[this.currentSetIndex];
    const targetReps = currentSet ? currentSet.reps : 10;
    const label = `Serie ${this.currentSetIndex + 1} de ${currentItem.sets.length}`;

    if (mode === 'voice') {
      if (this.voiceCounter) {
        this.voiceCounter.enable();
        this.voiceCounter.startNewSet(targetReps, label);
      }
    } else {
      if (this.voiceCounter) this.voiceCounter.disable();
    }

    this.updateUI();
  }

  /** Helper: devuelve el array de series del ejercicio actual */
  _currentSetsData() {
    const item = this.exerciseSetsData[this.currentExerciseIndex];
    return item ? item.sets : [];
  }


  renderContainer() {
    let el = document.getElementById('workout-player-modal');
    if (!el) {
      el = document.createElement('div');
      el.id = 'workout-player-modal';
      el.className = 'workout-player-modal';
      document.body.appendChild(el);
    }
    this.container = el;
    this.container.classList.add('is-active');
    this.updateUI();
  }

  startGlobalTimer() {
    if (this.workoutTimerInterval) clearInterval(this.workoutTimerInterval);
    this.workoutTimerInterval = setInterval(() => {
      const timerEl = document.getElementById('workout-global-timer');
      if (timerEl && this.startTime) {
        const elapsedSec = Math.floor((Date.now() - this.startTime) / 1000);
        const mins = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
        const secs = String(elapsedSec % 60).padStart(2, '0');
        timerEl.textContent = `${mins}:${secs}`;
      }
    }, 1000);
  }

  isBikeExercise(item) {
    if (!item) return false;
    return item.exerciseId === 'bicicleta_estatica' 
      || item.exerciseId === 'bicicleta-estatica-intervalos'
      || (item.exercise && (item.exercise.id === 'bicicleta_estatica' || item.exercise.id === 'bicicleta-estatica-intervalos' || item.exercise.isBike));
  }

  updateUI() {
    if (!this.container || !this.routine) return;
    const currentItem = this.exerciseSetsData[this.currentExerciseIndex];
    const { exercise, sets, restSeconds, isTimer } = currentItem;
    const isBike = this.isBikeExercise(currentItem);
    const isInterval = currentItem.exerciseId === 'bicicleta-estatica-intervalos' || (exercise && exercise.isInterval);
    if (isInterval) {
      this.bikeMode = 'intervals';
    } else if (!this.bikeMode) {
      this.bikeMode = 'continuous';
    }

    const totalExercises = this.exerciseSetsData.length;
    const currentProgressPercent = Math.round(((this.currentExerciseIndex) / totalExercises) * 100);

    // Sincronizar el contador de voz con la serie actual (solo si no es cronómetro ni bici)
    if (this.voiceCounter && !this.isResting && !isTimer && !isBike) {
      const currentSet = sets[this.currentSetIndex];
      if (currentSet) {
        const label = 'Serie ' + (this.currentSetIndex + 1) + ' de ' + sets.length;
        this.voiceCounter.startNewSet(currentSet.reps, label);
      }
    }

    const animationHtml = ExerciseAnimationRenderer.render(exercise.animationType, { exerciseId: exercise.id });
    const muscleMapHtml = MuscleMap.render({
      primaryMuscles: exercise.primaryMuscles || [],
      secondaryMuscles: exercise.secondaryMuscles || [],
      view: 'both'
    });
    const muscleLegendHtml = MuscleMap.renderLegend(exercise.primaryMuscles, exercise.secondaryMuscles);

    const activeSetReps = sets[this.currentSetIndex] ? sets[this.currentSetIndex].reps : (exercise.defaultReps || (isBike ? 900 : 45));
    const displayTimerSecs = this.isExerciseTimerRunning ? this.exerciseTimerSecondsRemaining : activeSetReps;
    const bikeMinutes = Math.max(1, Math.round(activeSetReps / 60));
    const bikeTotalSecs = activeSetReps || 900;
    const bikeProgressPercent = this.isExerciseTimerRunning 
      ? Math.min(100, Math.max(0, Math.round(((bikeTotalSecs - this.exerciseTimerSecondsRemaining) / bikeTotalSecs) * 100))) 
      : (sets[0]?.completed ? 100 : 0);

    // Cálculos de intervalos de bici si está activo
    const bikeElapsed = Math.max(0, bikeTotalSecs - (this.isExerciseTimerRunning ? this.exerciseTimerSecondsRemaining : bikeTotalSecs));
    const bikeCycle = bikeElapsed % 60;
    const bikeIsSprint = bikeCycle < 30;
    const bikePhaseRemaining = bikeIsSprint ? (30 - bikeCycle) : (60 - bikeCycle);
    const bikeRoundNum = Math.floor(bikeElapsed / 60) + 1;

    this.container.innerHTML = `
      <div class="player-wrapper">
        <!-- Barra Superior de Navegación del Entrenamiento -->
        <header class="player-header">
          <button type="button" class="btn-icon-cancel" id="btn-player-cancel" aria-label="Abandonar sesión">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          <div class="player-title-box">
            <span class="player-routine-tag">${this.routine.name}</span>
            <span class="player-counter">Ejercicio ${this.currentExerciseIndex + 1} de ${totalExercises}</span>
          </div>

          <div class="player-timer-badge" id="workout-global-timer">00:00</div>
        </header>

        <!-- Barra de Progreso del Entrenamiento -->
        <div class="player-progress-track">
          <div class="player-progress-fill" style="width: ${Math.max(8, currentProgressPercent)}%"></div>
        </div>

        <!-- Contenido Principal: Split Móvil / Tablet -->
        <div class="player-main-scroll">
          <div class="player-layout-grid">
            
            <!-- Columna 1: Ilustración Animada y Músculos -->
            <div class="player-visual-col">
              <div class="player-card visual-card">
                <div class="visual-header">
                  <span class="exercise-name-badge">${exercise.name}</span>
                  <span class="equipment-pill">${exercise.equipment}</span>
                </div>

                <!-- Ilustración Animada Vectorial -->
                <div class="exercise-anim-container">
                  ${animationHtml}
                </div>

                <!-- Pestañas de Vista Rápida: Animación vs Músculos -->
                <div class="visual-tabs">
                  <button class="visual-tab-btn active" data-tab="anim">Animación Técnica</button>
                  <button class="visual-tab-btn" data-tab="muscles">Músculos Involucrados</button>
                </div>

                <!-- Contenedor del Mapa Muscular Oculto o Visible según pestaña -->
                <div class="player-muscle-map-box" id="player-muscle-box" style="display: none;">
                  ${muscleMapHtml}
                  ${muscleLegendHtml}
                </div>
              </div>

              <!-- Consejos de Ejecución Rápida -->
              <div class="player-tips-box">
                <div class="tip-title">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#00F0FF" stroke-width="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  <span>Clave técnica:</span>
                </div>
                <p class="tip-text">${exercise.tips || exercise.description}</p>
              </div>
            </div>

            <!-- Columna 2: Tabla interactiva de Series / Panel de Sesión -->
            <div class="player-sets-col">
              ${isBike ? `
                <!-- PANEL DE SESIÓN CARDIO PARA BICICLETA ESTÁTICA -->
                <div class="bike-session-card">
                  <div class="bike-card-header">
                    <div class="bike-header-title-group">
                      <div class="bike-icon-badge">
                        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
                          <circle cx="5.5" cy="17.5" r="3.5"/>
                          <circle cx="18.5" cy="17.5" r="3.5"/>
                          <path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5L8.5 10l3.5-3.5 3 4h3.5"/>
                        </svg>
                      </div>
                      <div>
                        <h3 class="bike-card-title">${this.bikeMode === 'intervals' ? 'Bicicleta Estática a Intervalos' : 'Sesión de Bicicleta Estática'}</h3>
                        <span class="bike-card-subtitle">${this.bikeMode === 'intervals' ? 'Cardio HIIT • Alternancia de Sprints (30s) y Recuperación (30s)' : 'Cardio continuo • Cadencia ágil y fluida'}</span>
                      </div>
                    </div>
                    <span class="bike-status-pill ${sets[0]?.completed ? 'is-completed' : (this.isExerciseTimerRunning ? 'is-active' : '')}">
                      ${sets[0]?.completed ? '✓ Completada' : (this.isExerciseTimerRunning ? (this.bikeMode === 'intervals' ? '⚡ HIIT Activo' : '🚴 En curso') : 'Listo')}
                    </span>
                  </div>

                  <!-- Configuración de Duración y Modo -->
                  <div class="bike-duration-config">
                    <!-- Selector de Modo: Intervalos vs Continuo -->
                    <div class="bike-mode-pills">
                      <button type="button" class="btn-bike-mode ${this.bikeMode === 'intervals' ? 'active' : ''}" data-bikemode="intervals">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                        </svg>
                        <span>Intervalos HIIT (30s / 30s)</span>
                      </button>
                      <button type="button" class="btn-bike-mode ${this.bikeMode !== 'intervals' ? 'active' : ''}" data-bikemode="continuous">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                          <circle cx="12" cy="12" r="10"/>
                          <polyline points="12 6 12 12 16 14"/>
                        </svg>
                        <span>Ritmo Continuo</span>
                      </button>
                    </div>

                    <div class="bike-config-label">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#10b981" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                      </svg>
                      <span>Duración total de la sesión:</span>
                    </div>

                    <!-- Stepper y entrada directa de minutos -->
                    <div class="bike-stepper-box">
                      <button type="button" class="btn-bike-step" data-step="-5" title="Restar 5 minutos">-5m</button>
                      <button type="button" class="btn-bike-step" data-step="-1" title="Restar 1 minuto">-1m</button>
                      <div class="bike-input-wrapper">
                        <input type="number" id="bike-mins-input" class="bike-mins-input" min="1" max="180" value="${bikeMinutes}" />
                        <span class="bike-input-unit">min</span>
                      </div>
                      <button type="button" class="btn-bike-step" data-step="1" title="Sumar 1 minuto">+1m</button>
                      <button type="button" class="btn-bike-step" data-step="5" title="Sumar 5 minutos">+5m</button>
                    </div>

                    <!-- Accesos rápidos de duración -->
                    <div class="bike-presets-row">
                      <span class="bike-presets-hint">Accesos rápidos de duración:</span>
                      <div class="bike-preset-pills">
                        ${[5, 10, 15, 20, 30, 45, 60].map(m => `
                          <button type="button" class="btn-bike-preset ${bikeMinutes === m ? 'active' : ''}" data-mins="${m}">${m} min</button>
                        `).join('')}
                      </div>
                    </div>
                  </div>

                  <!-- Contador hacia atrás en vivo -->
                  <div class="bike-countdown-box">
                    <div class="bike-timer-main-display">
                      <span class="bike-timer-clock-label">CUENTA ATRÁS</span>
                      <div class="bike-timer-number" id="bike-timer-val">
                        ${this.formatTime(displayTimerSecs)}
                      </div>
                      <span class="bike-timer-status-msg" id="bike-timer-status">
                        ${sets[0]?.completed 
                          ? '🎉 ¡Sesión de bicicleta completada con éxito! Gran esfuerzo.' 
                          : (this.isExerciseTimerRunning 
                              ? (this.bikeMode === 'intervals' 
                                  ? (bikeIsSprint ? '⚡ ¡SPRINT! Pedalea con máxima potencia' : '🚴 RECUPERACIÓN: Pedaleo suave') 
                                  : '🔥 ¡Pedaleando! Mantén una cadencia continua.') 
                              : 'Pulsa «Iniciar Sesión» para arrancar la cuenta atrás.')}
                      </span>
                    </div>

                    <!-- Banner de Fase HIIT en caso de modo intervalos -->
                    ${this.bikeMode === 'intervals' ? `
                      <div class="bike-interval-banner ${bikeIsSprint ? 'is-sprint' : 'is-recovery'}" id="bike-interval-banner">
                        <div class="bike-interval-phase-badge" id="bike-interval-badge">
                          <span>${bikeIsSprint ? '⚡ ¡SPRINT MÁXIMA POTENCIA!' : '🚴 RECUPERACIÓN ACTIVA'}</span>
                        </div>
                        <span class="bike-interval-sub" id="bike-interval-phase-timer">
                          ${bikeIsSprint ? `Sprint: ${bikePhaseRemaining}s` : `Recuperación: ${bikePhaseRemaining}s`} • Ronda ${bikeRoundNum}
                        </span>
                      </div>
                    ` : ''}

                    <!-- Barra de progreso de la sesión -->
                    <div class="bike-progress-track">
                      <div class="bike-progress-fill" id="bike-progress-fill" style="width: ${bikeProgressPercent}%;"></div>
                    </div>
                  </div>

                  <!-- Controles de la sesión -->
                  <div class="bike-action-controls">
                    <button type="button" class="btn-bike-toggle ${this.isExerciseTimerRunning ? 'is-running' : ''}" id="btn-bike-toggle">
                      ${this.isExerciseTimerRunning ? `
                        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                          <rect x="6" y="4" width="4" height="16"/>
                          <rect x="14" y="4" width="4" height="16"/>
                        </svg>
                        <span>Pausar Sesión</span>
                      ` : `
                        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                          <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                        <span>${this.exerciseTimerSecondsRemaining > 0 && this.exerciseTimerSecondsRemaining < bikeTotalSecs ? 'Reanudar Sesión' : `Iniciar Sesión (${this.formatTime(displayTimerSecs)})`}</span>
                      `}
                    </button>

                    <button type="button" class="btn-bike-reset" id="btn-bike-reset" title="Reiniciar tiempo a la duración configurada">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
                      </svg>
                      <span>Reiniciar</span>
                    </button>

                    <button type="button" class="btn-bike-complete ${sets[0]?.completed ? 'is-done' : ''}" id="btn-bike-complete" title="Marcar la sesión como completada">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>${sets[0]?.completed ? 'Sesión Lista ✓' : 'Completar Sesión'}</span>
                    </button>
                  </div>
                </div>
              ` : `
                <div class="player-card sets-card">
                  <div class="sets-header sets-header-voice-row">
                    <h3 class="sets-card-title">Registro de Series</h3>

                    <div class="tracking-mode-bar" id="tracking-mode-bar">
                      ${VoiceRepCounter.isSupported() ? `
                        <button type="button" class="mode-chip-btn ${this.activeTrackingMode === 'voice' ? 'active' : ''}" data-mode="voice" title="Contador por Voz">
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                            <line x1="12" y1="19" x2="12" y2="23"/>
                          </svg>
                          <span>Voz</span>
                        </button>
                      ` : ''}

                      <button type="button" class="mode-chip-btn ${this.activeTrackingMode === 'manual' ? 'active' : ''}" data-mode="manual" title="Manual">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                          <polygon points="16 3 21 8 8 21 3 21 3 16 16 3"/>
                        </svg>
                        <span>Manual</span>
                      </button>
                    </div>

                    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                      <select class="rest-preset-pill" id="global-rest-select" aria-label="Cambiar descanso">
                        ${[30, 45, 60, 90, 120, 150, 180, 240, 300].map(t => 
                          `<option value="${t}" ${restSeconds === t ? 'selected' : ''}>Descanso: ${t}s</option>`
                        ).join('')}
                      </select>
                    </div>
                  </div>

                  <div class="sets-table">
                    <div class="sets-row header-row">
                      <span class="col-num">Serie</span>
                      <span class="col-weight">${isTimer ? 'Carga' : 'Peso (kg)'}</span>
                      <span class="col-reps">${isTimer ? 'Tiempo (s)' : 'Reps'}</span>
                      <span class="col-check">Listo</span>
                    </div>

                    ${sets.map((set, idx) => `
                      <div class="sets-row ${set.completed ? 'is-done' : ''} ${idx === this.currentSetIndex ? 'is-current' : ''}" data-set-index="${idx}">
                        <div class="col-num">
                          <span class="set-indicator">${set.setNumber}</span>
                        </div>
                        <div class="col-weight">
                          <div class="input-stepper">
                            <button type="button" class="btn-step" data-action="dec-weight" data-index="${idx}">-</button>
                            <input type="number" step="0.5" class="set-input weight-input" data-index="${idx}" value="${set.weight}" />
                            <button type="button" class="btn-step" data-action="inc-weight" data-index="${idx}">+</button>
                          </div>
                        </div>
                        <div class="col-reps">
                          <div class="input-stepper">
                            <button type="button" class="btn-step" data-action="dec-reps" data-index="${idx}">-</button>
                            <input type="number" class="set-input reps-input" data-index="${idx}" value="${set.reps}" />
                            <button type="button" class="btn-step" data-action="inc-reps" data-index="${idx}">+</button>
                          </div>
                        </div>
                        <div class="col-check">
                          <button type="button" class="btn-check-set ${set.completed ? 'completed' : ''}" data-index="${idx}" aria-label="Completar serie">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    `).join('')}
                  </div>

                  <!-- Temporizador Isométrico de Plancha en vivo si es un ejercicio cronometrado (Plancha) -->
                  ${isTimer ? `
                    <div class="exercise-countdown-card">
                      <div class="countdown-card-header">
                        <div class="countdown-title-group">
                          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--neon-cyan)" stroke-width="2">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                          <span class="countdown-card-title">Contador Regresivo de Plancha</span>
                        </div>
                        <span class="countdown-set-tag">Serie ${Math.min(this.currentSetIndex + 1, sets.length)} de ${sets.length}</span>
                      </div>

                      <div class="countdown-main-display">
                        <div class="countdown-number" id="ex-timer-val">
                          ${this.formatTime(displayTimerSecs)}
                        </div>
                        <span class="countdown-subtext" id="ex-timer-status">
                          ${this.isExerciseTimerRunning ? '🔥 ¡Mantén la posición!' : 'Pulsa para iniciar la cuenta atrás'}
                        </span>
                      </div>

                      <div class="countdown-preset-bar">
                        <span class="preset-label">Cambiar tiempo:</span>
                        <div class="preset-pills">
                          <button type="button" class="btn-time-preset" data-sec="15">15s</button>
                          <button type="button" class="btn-time-preset" data-sec="30">30s</button>
                          <button type="button" class="btn-time-preset" data-sec="45">45s</button>
                          <button type="button" class="btn-time-preset" data-sec="60">60s</button>
                          <button type="button" class="btn-time-preset" data-sec="90">90s</button>
                          <button type="button" class="btn-time-preset" data-sec="120">120s</button>
                        </div>
                      </div>

                      <div class="countdown-controls">
                        <button type="button" class="btn-timer-toggle ${this.isExerciseTimerRunning ? 'is-running' : ''}" id="btn-toggle-ex-timer">
                          ${this.isExerciseTimerRunning ? `
                            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                              <rect x="6" y="4" width="4" height="16"/>
                              <rect x="14" y="4" width="4" height="16"/>
                            </svg>
                            <span>Pausar</span>
                          ` : `
                            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                              <polygon points="5 3 19 12 5 21 5 3" />
                            </svg>
                            <span>Iniciar Cuenta Atrás (${sets[this.currentSetIndex]?.reps || 45}s)</span>
                          `}
                        </button>

                        <button type="button" class="btn-timer-reset" id="btn-reset-ex-timer" title="Reiniciar tiempo">
                          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
                          </svg>
                          <span>Reiniciar</span>
                        </button>
                      </div>
                    </div>
                  ` : ''}

                  <!-- Botón de acción principal de la serie regular -->
                  <button type="button" class="btn-primary-action" id="btn-complete-current-set" style="margin-top: 14px;">
                    <span class="btn-glow"></span>
                    <span class="btn-text">
                      ${this.currentSetIndex < sets.length 
                        ? `Completar Serie ${this.currentSetIndex + 1} (${sets[this.currentSetIndex].reps}${isTimer ? 's' : ' reps'})`
                        : 'Todas las series completadas'}
                    </span>
                  </button>
                </div>
              `}


              <!-- Controles de navegación entre ejercicios -->
              <div class="player-nav-controls">
                <button type="button" class="btn-nav-prev" id="btn-prev-exercise" ${this.currentExerciseIndex === 0 ? 'disabled' : ''}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                  <span>Anterior</span>
                </button>

                ${this.currentExerciseIndex < totalExercises - 1 ? `
                  <button type="button" class="btn-nav-next" id="btn-next-exercise">
                    <span>Siguiente Ejercicio</span>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                ` : `
                  <button type="button" class="btn-nav-finish" id="btn-finish-workout">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    <span>Finalizar Entrenamiento</span>
                  </button>
                `}
              </div>
            </div>

          </div>
        </div>

        <!-- Overlay de Temporizador de Descanso -->
        <div class="rest-timer-overlay ${this.isResting ? 'is-visible' : ''}" id="rest-timer-overlay">
          <div class="rest-timer-dialog">
            <div class="rest-header">
              <span class="rest-sub">DESCANSO ENTRE SERIES</span>
              <h3 class="rest-next-hint">Siguiente: ${this.getNextPreviewText()}</h3>
            </div>

            <div class="rest-clock-wrapper">
              <svg class="rest-clock-svg" viewBox="0 0 200 200">
                <circle cx="100" cy="100" r="85" class="rest-track-circle" />
                <circle cx="100" cy="100" r="85" class="rest-progress-circle" id="rest-svg-progress" />
              </svg>
              <div class="rest-countdown-value" id="rest-digital-countdown">00:00</div>
            </div>

            <div class="rest-adjust-buttons">
              <button type="button" class="btn-rest-adjust" id="btn-rest-minus">-15s</button>
              <button type="button" class="btn-rest-adjust" id="btn-rest-plus">+15s</button>
            </div>

            <button type="button" class="btn-skip-rest" id="btn-skip-rest">
              <span>Continuar Ya</span>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="5 4 15 12 5 20 5 4" />
                <line x1="19" y1="5" x2="19" y2="19" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
    this._injectMicButton();
  }

  /** Inyecta el botón de micrófono en el slot reservado del HTML */
  _injectMicButton() {
    if (!this.voiceCounter) return;
    const slot = document.getElementById('voice-mic-btn-slot');
    if (!slot) return;
    slot.innerHTML = '';
    const btn = this.voiceCounter.createMicButton((isEnabled) => {
      if (!isEnabled) {
        // Al desactivar, limpiar indicadores visuales
        document.querySelectorAll('.sets-row.voice-active').forEach(r => r.classList.remove('voice-active'));
      } else {
        // Al activar, configurar la serie actual
        const currentItem = this.exerciseSetsData[this.currentExerciseIndex];
        if (currentItem) {
          const currentSet = currentItem.sets[this.currentSetIndex];
          if (currentSet) {
            const label = 'Serie ' + (this.currentSetIndex + 1) + ' de ' + currentItem.sets.length;
            this.voiceCounter.startNewSet(currentSet.reps, label);
          }
        }
      }
    });
    slot.appendChild(btn);
  }

  getNextPreviewText() {
    const currentItem = this.exerciseSetsData[this.currentExerciseIndex];
    if (this.currentSetIndex < currentItem.sets.length) {
      return `Serie ${this.currentSetIndex + 1} de ${currentItem.exercise.name}`;
    }
    const nextItem = this.exerciseSetsData[this.currentExerciseIndex + 1];
    if (nextItem) {
      return nextItem.exercise.name;
    }
    return 'Fin del entrenamiento';
  }

  bindEvents() {
    // Botón cancelar / salir
    const btnCancel = document.getElementById('btn-player-cancel');
    if (btnCancel) {
      btnCancel.onclick = () => {
        if (confirm('¿Quieres pausar o salir del entrenamiento actual?')) {
          this.destroy();
          this.onExit();
        }
      };
    }

    // Selector de Modo (Cámara, Voz, Manual)
    this.container.querySelectorAll('.mode-chip-btn').forEach(btn => {
      btn.onclick = () => {
        const mode = btn.dataset.mode;
        this.switchTrackingMode(mode);
      };
    });

    // Pestañas Animación vs Músculos

    const tabBtns = this.container.querySelectorAll('.visual-tab-btn');
    const animContainer = this.container.querySelector('.exercise-anim-container');
    const muscleBox = document.getElementById('player-muscle-box');

    tabBtns.forEach(btn => {
      btn.onclick = () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (btn.dataset.tab === 'anim') {
          animContainer.style.display = 'block';
          muscleBox.style.display = 'none';
        } else {
          animContainer.style.display = 'none';
          muscleBox.style.display = 'block';
        }
      };
    });

    // Inputs y Steppers de Peso / Reps
    const currentItem = this.exerciseSetsData[this.currentExerciseIndex];
    this.container.querySelectorAll('.btn-step').forEach(btn => {
      btn.onclick = () => {
        const action = btn.dataset.action;
        const index = parseInt(btn.dataset.index, 10);
        const set = currentItem.sets[index];
        if (!set) return;

        if (action === 'inc-weight') set.weight = Math.round((set.weight + 1) * 10) / 10;
        if (action === 'dec-weight') set.weight = Math.max(0.5, Math.round((set.weight - 1) * 10) / 10);
        if (action === 'inc-reps') set.reps = Math.min(100, set.reps + 1);
        if (action === 'dec-reps') set.reps = Math.max(1, set.reps - 1);

        this.updateUI();
      };
    });

    this.container.querySelectorAll('.set-input').forEach(input => {
      input.onchange = () => {
        const index = parseInt(input.dataset.index, 10);
        const set = currentItem.sets[index];
        if (!set) return;
        if (input.classList.contains('weight-input')) {
          set.weight = parseFloat(input.value) || 0;
        } else if (input.classList.contains('reps-input')) {
          set.reps = parseInt(input.value, 10) || 0;
        }
      };
    });

    // Botón completar serie individual
    this.container.querySelectorAll('.btn-check-set').forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.dataset.index, 10);
        this.toggleSetCompletion(idx);
      };
    });

    // Botón completar serie / sesión actual
    const isBike = this.isBikeExercise(currentItem);
    const btnCompleteCurrent = document.getElementById('btn-complete-current-set');
    if (btnCompleteCurrent) {
      btnCompleteCurrent.onclick = () => {
        if (isBike) {
          const bikeSet = currentItem.sets[0];
          if (!bikeSet.completed) {
            bikeSet.completed = true;
            this.stopExerciseTimer();
            AudioFeedback.playGoBeep();
            this.updateUI();
          } else {
            // Si ya está completada la sesión, pasar al siguiente ejercicio o terminar
            if (this.currentExerciseIndex < this.exerciseSetsData.length - 1) {
              this.goToExercise(this.currentExerciseIndex + 1);
            } else {
              this.finishWorkout();
            }
          }
          return;
        }

        if (this.currentSetIndex < currentItem.sets.length) {
          this.completeSetAndRest(this.currentSetIndex);
        } else {
          // Si ya completó todas, avanzar al siguiente ejercicio
          if (this.currentExerciseIndex < this.exerciseSetsData.length - 1) {
            this.goToExercise(this.currentExerciseIndex + 1);
          } else {
            this.finishWorkout();
          }
        }
      };
    }

    // Navegación anterior / siguiente
    const btnPrev = document.getElementById('btn-prev-exercise');
    if (btnPrev) {
      btnPrev.onclick = () => {
        if (this.currentExerciseIndex > 0) {
          this.goToExercise(this.currentExerciseIndex - 1);
        }
      };
    }

    // Selector de tiempo de descanso global para este ejercicio
    const restSelect = document.getElementById('global-rest-select');
    if (restSelect) {
      restSelect.onchange = () => {
        const newRest = parseInt(restSelect.value, 10);
        if (newRest && currentItem) {
          currentItem.restSeconds = newRest;
        }
      };
    }

    const btnNext = document.getElementById('btn-next-exercise');
    if (btnNext) {
      btnNext.onclick = () => {
        if (this.currentExerciseIndex < this.exerciseSetsData.length - 1) {
          this.goToExercise(this.currentExerciseIndex + 1);
        }
      };
    }

    const btnFinish = document.getElementById('btn-finish-workout');
    if (btnFinish) {
      btnFinish.onclick = () => {
        this.finishWorkout();
      };
    }

    // Controles del temporizador de descanso
    const btnSkipRest = document.getElementById('btn-skip-rest');
    if (btnSkipRest) {
      btnSkipRest.onclick = () => {
        this.stopRestTimer();
      };
    }

    const btnRestMinus = document.getElementById('btn-rest-minus');
    if (btnRestMinus) {
      btnRestMinus.onclick = () => {
        this.restSecondsRemaining = Math.max(5, this.restSecondsRemaining - 15);
        this.updateRestClockDisplay();
      };
    }

    const btnRestPlus = document.getElementById('btn-rest-plus');
    if (btnRestPlus) {
      btnRestPlus.onclick = () => {
        this.restSecondsRemaining += 15;
        this.restTotalSeconds += 15;
        this.updateRestClockDisplay();
      };
    }

    // ── EVENTOS EXCLUSIVOS DE BICICLETA ESTÁTICA ──────────────────────────────
    if (isBike) {
      const bikeSet = currentItem.sets[0];

      // Selector de modo (Intervalos HIIT / Continuo)
      this.container.querySelectorAll('.btn-bike-mode').forEach(btn => {
        btn.onclick = () => {
          const mode = btn.dataset.bikemode;
          if (mode && this.bikeMode !== mode) {
            this.bikeMode = mode;
            this.updateUI();
          }
        };
      });

      // Stepper de minutos (+/-)
      this.container.querySelectorAll('.btn-bike-step').forEach(btn => {
        btn.onclick = () => {
          const step = parseInt(btn.dataset.step, 10);
          if (!bikeSet) return;
          const currentMins = Math.max(1, Math.round((bikeSet.reps || 900) / 60));
          const newMins = Math.min(180, Math.max(1, currentMins + step));
          bikeSet.reps = newMins * 60;
          this.stopExerciseTimer();
          this.exerciseTimerSecondsRemaining = bikeSet.reps;
          this.updateUI();
        };
      });

      // Entrada numérica directa de minutos
      const minsInput = document.getElementById('bike-mins-input');
      if (minsInput) {
        minsInput.onchange = () => {
          let val = parseInt(minsInput.value, 10);
          if (isNaN(val) || val < 1) val = 1;
          if (val > 180) val = 180;
          if (bikeSet) {
            bikeSet.reps = val * 60;
            this.stopExerciseTimer();
            this.exerciseTimerSecondsRemaining = bikeSet.reps;
            this.updateUI();
          }
        };
      }

      // Píldoras de duraciones rápidas predefinidas (5m, 10m, 15m, 20m, 30m, 45m, 60m)
      this.container.querySelectorAll('.btn-bike-preset').forEach(btn => {
        btn.onclick = () => {
          const mins = parseInt(btn.dataset.mins, 10);
          if (bikeSet && mins) {
            bikeSet.reps = mins * 60;
            this.stopExerciseTimer();
            this.exerciseTimerSecondsRemaining = bikeSet.reps;
            this.updateUI();
          }
        };
      });

      // Botón Iniciar / Pausar / Reanudar sesión de bicicleta
      const btnBikeToggle = document.getElementById('btn-bike-toggle');
      if (btnBikeToggle) {
        btnBikeToggle.onclick = () => {
          const target = bikeSet ? bikeSet.reps : 900;
          this.toggleExerciseTimer(target);
        };
      }

      // Botón Reiniciar tiempo de bicicleta
      const btnBikeReset = document.getElementById('btn-bike-reset');
      if (btnBikeReset) {
        btnBikeReset.onclick = () => {
          this.stopExerciseTimer();
          const target = bikeSet ? bikeSet.reps : 900;
          this.exerciseTimerSecondsRemaining = target;
          this.updateUI();
        };
      }

      // Botón Completar sesión de bicicleta
      const btnBikeComplete = document.getElementById('btn-bike-complete');
      if (btnBikeComplete) {
        btnBikeComplete.onclick = () => {
          if (bikeSet) {
            bikeSet.completed = true;
            this.stopExerciseTimer();
            AudioFeedback.playGoBeep();
            this.updateUI();
          }
        };
      }
    } else {
      // Eventos del temporizador regresivo de ejercicio isométrico (Plancha)
      this.container.querySelectorAll('.btn-time-preset').forEach(btn => {
        btn.onclick = () => {
          const sec = parseInt(btn.dataset.sec, 10);
          const set = currentItem.sets[this.currentSetIndex];
          if (set) {
            set.reps = sec;
            this.exerciseTimerSecondsRemaining = sec;
            const valEl = document.getElementById('ex-timer-val');
            if (valEl && !this.isExerciseTimerRunning) {
              valEl.textContent = this.formatTime(sec);
            }
            this.updateUI();
          }
        };
      });

      const btnToggleExTimer = document.getElementById('btn-toggle-ex-timer');
      if (btnToggleExTimer) {
        btnToggleExTimer.onclick = () => {
          const currentSet = currentItem.sets[this.currentSetIndex];
          this.toggleExerciseTimer(currentSet ? currentSet.reps : 45);
        };
      }

      const btnResetExTimer = document.getElementById('btn-reset-ex-timer');
      if (btnResetExTimer) {
        btnResetExTimer.onclick = () => {
          const currentSet = currentItem.sets[this.currentSetIndex];
          const sec = currentSet ? currentSet.reps : 45;
          this.stopExerciseTimer();
          this.exerciseTimerSecondsRemaining = sec;
          const valEl = document.getElementById('ex-timer-val');
          if (valEl) valEl.textContent = this.formatTime(sec);
          const statusEl = document.getElementById('ex-timer-status');
          if (statusEl) statusEl.textContent = 'Pulsa para iniciar la cuenta atrás';
          this.updateUI();
        };
      }
    }
  }

  toggleExerciseTimer(targetSeconds) {
    if (this.isExerciseTimerRunning) {
      this.pauseExerciseTimer();
    } else {
      this.startExerciseTimer(targetSeconds);
    }
  }

  startExerciseTimer(targetSeconds) {
    if (this.isExerciseTimerRunning) return;

    const currentItem = this.exerciseSetsData[this.currentExerciseIndex];
    if (!currentItem) return;
    const isBike = this.isBikeExercise(currentItem);

    const currentSet = (isBike ? currentItem.sets[0] : currentItem.sets[this.currentSetIndex]) || currentItem.sets[0];
    const totalSecs = currentSet ? currentSet.reps : (isBike ? 900 : 45);

    if (!this.exerciseTimerSecondsRemaining || this.exerciseTimerSecondsRemaining <= 0) {
      this.exerciseTimerSecondsRemaining = targetSeconds || totalSecs;
    }

    this.isExerciseTimerRunning = true;
    AudioFeedback.playGoBeep();

    const displayEl = document.getElementById(isBike ? 'bike-timer-val' : 'ex-timer-val');
    const statusEl = document.getElementById(isBike ? 'bike-timer-status' : 'ex-timer-status');
    const btnToggle = document.getElementById(isBike ? 'btn-bike-toggle' : 'btn-toggle-ex-timer');
    const progressFill = document.getElementById('bike-progress-fill');

    if (statusEl) {
      if (isBike) {
        statusEl.textContent = this.bikeMode === 'intervals' 
          ? '⚡ ¡SPRINT! Pedalea con máxima potencia' 
          : '🔥 ¡Pedaleando! Mantén una cadencia continua.';
      } else {
        statusEl.textContent = '🔥 ¡Mantén la posición!';
      }
    }
    if (btnToggle) {
      btnToggle.classList.add('is-running');
      btnToggle.innerHTML = `
        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
          <rect x="6" y="4" width="4" height="16"/>
          <rect x="14" y="4" width="4" height="16"/>
        </svg>
        <span>${isBike ? 'Pausar Sesión' : 'Pausar'}</span>
      `;
    }

    if (this.exerciseTimerInterval) clearInterval(this.exerciseTimerInterval);
    this.exerciseTimerInterval = setInterval(() => {
      this.exerciseTimerSecondsRemaining--;

      if (displayEl) {
        displayEl.textContent = this.formatTime(Math.max(0, this.exerciseTimerSecondsRemaining));
      }

      if (progressFill && totalSecs > 0) {
        const pct = Math.min(100, Math.max(0, Math.round(((totalSecs - this.exerciseTimerSecondsRemaining) / totalSecs) * 100)));
        progressFill.style.width = pct + '%';
      }

      // Dinámica de intervalos HIIT en bicicleta
      if (isBike && this.bikeMode === 'intervals') {
        const elapsed = Math.max(0, totalSecs - this.exerciseTimerSecondsRemaining);
        const cycle = elapsed % 60;
        const isSprint = cycle < 30;
        const phaseRemaining = isSprint ? (30 - cycle) : (60 - cycle);
        const roundNum = Math.floor(elapsed / 60) + 1;

        const banner = document.getElementById('bike-interval-banner');
        const badge = document.getElementById('bike-interval-badge');
        const phaseTimer = document.getElementById('bike-interval-phase-timer');

        if (banner) {
          banner.className = `bike-interval-banner ${isSprint ? 'is-sprint' : 'is-recovery'}`;
        }
        if (badge) {
          badge.innerHTML = `<span>${isSprint ? '⚡ ¡SPRINT MÁXIMA POTENCIA!' : '🚴 RECUPERACIÓN ACTIVA'}</span>`;
        }
        if (phaseTimer) {
          phaseTimer.textContent = `${isSprint ? 'Sprint' : 'Recuperación'}: ${phaseRemaining}s • Ronda ${roundNum}`;
        }
        if (statusEl) {
          statusEl.textContent = isSprint ? '⚡ ¡SPRINT! Pedalea con máxima potencia' : '🚴 RECUPERACIÓN: Pedaleo suave';
        }

        // Aviso sonoro al cambiar de fase
        if (cycle === 0) {
          AudioFeedback.playGoBeep();
        } else if (cycle === 30) {
          AudioFeedback.playCountdownBeep();
        }
      }

      if (this.exerciseTimerSecondsRemaining === 3 || this.exerciseTimerSecondsRemaining === 2 || this.exerciseTimerSecondsRemaining === 1) {
        AudioFeedback.playCountdownBeep();
      }

      if (this.exerciseTimerSecondsRemaining <= 0) {
        this.stopExerciseTimer();
        AudioFeedback.playGoBeep();
        if (isBike) {
          if (currentItem.sets[0]) currentItem.sets[0].completed = true;
          this.updateUI();
        } else if (this.currentSetIndex < currentItem.sets.length) {
          this.completeSetAndRest(this.currentSetIndex);
        }
      }
    }, 1000);
  }

  pauseExerciseTimer() {
    this.isExerciseTimerRunning = false;
    if (this.exerciseTimerInterval) clearInterval(this.exerciseTimerInterval);

    const currentItem = this.exerciseSetsData[this.currentExerciseIndex];
    const isBike = this.isBikeExercise(currentItem);

    const statusEl = document.getElementById(isBike ? 'bike-timer-status' : 'ex-timer-status');
    const btnToggle = document.getElementById(isBike ? 'btn-bike-toggle' : 'btn-toggle-ex-timer');

    if (statusEl) {
      statusEl.textContent = isBike ? '⏸️ Sesión pausada (Pulsa para reanudar)' : 'Pausado (Pulsa para reanudar)';
    }
    if (btnToggle) {
      btnToggle.classList.remove('is-running');
      btnToggle.innerHTML = `
        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
        <span>${isBike ? 'Reanudar Sesión' : 'Reanudar'}</span>
      `;
    }
  }

  stopExerciseTimer() {
    this.isExerciseTimerRunning = false;
    if (this.exerciseTimerInterval) clearInterval(this.exerciseTimerInterval);
    this.exerciseTimerSecondsRemaining = 0;
  }


  toggleSetCompletion(index) {
    const currentItem = this.exerciseSetsData[this.currentExerciseIndex];
    const set = currentItem.sets[index];
    if (!set) return;

    set.completed = !set.completed;
    if (set.completed) {
      this.currentSetIndex = Math.min(currentItem.sets.length, index + 1);
      this.startRestTimer(currentItem.restSeconds);
    }
    this.updateUI();
  }

  completeSetAndRest(index) {
    const currentItem = this.exerciseSetsData[this.currentExerciseIndex];
    const set = currentItem.sets[index];
    if (set) {
      set.completed = true;
      this.currentSetIndex = index + 1;
      this.startRestTimer(currentItem.restSeconds);
    }
  }

  goToExercise(index) {
    this.stopRestTimer();
    this.stopExerciseTimer();
    this.bikeMode = null;
    this.currentExerciseIndex = index;
    // Buscar la primera serie incompleta
    const currentItem = this.exerciseSetsData[this.currentExerciseIndex];
    const firstIncomplete = currentItem.sets.findIndex(s => !s.completed);
    this.currentSetIndex = firstIncomplete >= 0 ? firstIncomplete : currentItem.sets.length;
    this.updateUI();
  }

  startRestTimer(seconds) {
    this.stopExerciseTimer();
    this.isResting = true;
    this.restTotalSeconds = seconds || 60;
    this.restSecondsRemaining = this.restTotalSeconds;

    // Pausar escucha de voz durante el descanso
    if (this.voiceCounter) this.voiceCounter.pause();

    const overlay = document.getElementById('rest-timer-overlay');
    if (overlay) overlay.classList.add('is-visible');

    AudioFeedback.playGoBeep();
    this.updateRestClockDisplay();

    if (this.restTimerInterval) clearInterval(this.restTimerInterval);
    this.restTimerInterval = setInterval(() => {
      this.restSecondsRemaining--;

      // Pitidos en los últimos 3 segundos
      if (this.restSecondsRemaining === 3 || this.restSecondsRemaining === 2 || this.restSecondsRemaining === 1) {
        AudioFeedback.playCountdownBeep();
      }

      if (this.restSecondsRemaining <= 0) {
        this.stopRestTimer();
        AudioFeedback.playGoBeep();
        // Si ya completó todas las series de este ejercicio, saltar al siguiente automáticamente
        const currentItem = this.exerciseSetsData[this.currentExerciseIndex];
        if (this.currentSetIndex >= currentItem.sets.length) {
          if (this.currentExerciseIndex < this.exerciseSetsData.length - 1) {
            this.goToExercise(this.currentExerciseIndex + 1);
          }
        }
      } else {
        this.updateRestClockDisplay();
      }
    }, 1000);
  }

  stopRestTimer() {
    this.isResting = false;
    if (this.restTimerInterval) clearInterval(this.restTimerInterval);
    const overlay = document.getElementById('rest-timer-overlay');
    if (overlay) overlay.classList.remove('is-visible');
    
    this.updateUI();
    
    // Reanudar herramientas de conteo automático para la siguiente serie
    if (this.voiceCounter && this.activeTrackingMode === 'voice') {
      this.voiceCounter.resume();
    }
  }

  updateRestClockDisplay() {
    const textEl = document.getElementById('rest-digital-countdown');
    const circleEl = document.getElementById('rest-svg-progress');
    if (textEl) {
      const mins = String(Math.floor(this.restSecondsRemaining / 60)).padStart(2, '0');
      const secs = String(this.restSecondsRemaining % 60).padStart(2, '0');
      textEl.textContent = `${mins}:${secs}`;
    }

    if (circleEl && this.restTotalSeconds > 0) {
      const circumference = 2 * Math.PI * 85; // 534.07
      const fraction = Math.max(0, this.restSecondsRemaining / this.restTotalSeconds);
      const strokeDashoffset = circumference * (1 - fraction);
      circleEl.style.strokeDasharray = `${circumference}`;
      circleEl.style.strokeDashoffset = `${strokeDashoffset}`;
    }
  }

  /**
   * Finaliza el entrenamiento y muestra el resumen
   */
  finishWorkout() {
    this.stopRestTimer();
    if (this.workoutTimerInterval) clearInterval(this.workoutTimerInterval);

    AudioFeedback.playVictoryFanfare();

    const elapsedSeconds = Math.floor((Date.now() - this.startTime) / 1000);
    const totalMinutes = Math.max(1, Math.round(elapsedSeconds / 60));

    // Calcular estadísticas
    let totalVolume = 0;
    let completedSetsCount = 0;
    const exerciseRecords = {};

    this.exerciseSetsData.forEach(item => {
      let exerciseVolume = 0;
      let lastWeight = 0;
      let lastReps = 0;

      item.sets.forEach(s => {
        if (s.completed) {
          completedSetsCount++;
          const vol = (s.weight || 0) * (s.reps || 0);
          exerciseVolume += vol;
          lastWeight = s.weight;
          lastReps = s.reps;
        }
      });

      totalVolume += exerciseVolume;
      if (lastWeight > 0) {
        exerciseRecords[item.exerciseId] = {
          lastWeight,
          lastReps
        };
      }
    });

    const record = {
      routineId: this.routine.id,
      routineName: this.routine.name,
      durationSeconds: elapsedSeconds,
      totalVolume: Math.round(totalVolume),
      completedSets: completedSetsCount,
      exerciseRecords
    };

    // Guardar en LocalStorage
    StorageManager.recordWorkout(record);

    this.renderSummaryModal(record, totalMinutes);
  }

  renderSummaryModal(record, minutes) {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="summary-wrapper">
        <div class="summary-card">
          <div class="trophy-badge">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#FF5E3A" stroke-width="2">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
              <path d="M4 22h16" />
              <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
              <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
              <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
            </svg>
          </div>

          <span class="summary-congrats">¡ENTRENAMIENTO COMPLETADO!</span>
          <h2 class="summary-title">${record.routineName}</h2>
          <p class="summary-subtitle">Gran trabajo en casa. Tu tren superior ha recibido el estímulo perfecto.</p>

          <div class="summary-stats-grid">
            <div class="summary-stat-box">
              <span class="stat-value">${minutes} min</span>
              <span class="stat-label">Tiempo Total</span>
            </div>
            <div class="summary-stat-box">
              <span class="stat-value">${record.totalVolume} kg</span>
              <span class="stat-label">Volumen Levantado</span>
            </div>
            <div class="summary-stat-box">
              <span class="stat-value">${record.completedSets}</span>
              <span class="stat-label">Series Realizadas</span>
            </div>
          </div>

          <button type="button" class="btn-summary-done" id="btn-summary-exit">
            <span>Volver al Menú Principal</span>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>
      </div>
    `;

    const btnExit = document.getElementById('btn-summary-exit');
    if (btnExit) {
      btnExit.onclick = () => {
        this.destroy();
        this.onFinish();
      };
    }
  }

  destroy() {
    this.stopExerciseTimer();
    if (this.workoutTimerInterval) clearInterval(this.workoutTimerInterval);
    if (this.restTimerInterval) clearInterval(this.restTimerInterval);
    if (this.voiceCounter) {
      this.voiceCounter.destroy();
      this.voiceCounter = null;
    }
    if (this.container) {
      this.container.classList.remove('is-active');
      this.container.innerHTML = '';
    }
  }
}

