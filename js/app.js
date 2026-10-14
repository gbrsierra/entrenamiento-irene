// Controlador principal de la aplicación IronUpper
import { EXERCISES, MUSCLE_GROUPS } from './exercises-data.js?v=8';
import { ROUTINES } from './routines-data.js?v=8';
import { MuscleMap } from './muscle-map.js?v=8';
import { ExerciseAnimationRenderer } from './animations-render.js?v=8';
import { StorageManager } from './storage.js?v=8';
import { WorkoutPlayer } from './workout-player.js?v=8';

class App {
  constructor() {
    this.currentView = 'view-routines';
    this.selectedCategory = 'todos';
    this.searchQuery = '';
    this.selectedMuscleAnatomy = 'chest';

    this.workoutPlayer = new WorkoutPlayer({
      onFinish: () => {
        this.updateStatsView();
        this.updateStreakBadge();
        this.switchView('view-progress');
      },
      onExit: () => {
        this.switchView('view-routines');
      }
    });

    this.init();
  }

  init() {
    this.setupNavigation();
    this.renderRoutines();
    this.renderExercises();
    this.renderAnatomySection();
    this.updateStatsView();
    this.updateStreakBadge();
    this.setupExerciseModalEvents();
    this.setupSearchAndFilters();
  }

  // ==========================================
  // NAVEGACIÓN ENTRE VISTAS (TAB BAR)
  // ==========================================
  setupNavigation() {
    const navItems = document.querySelectorAll('.bottom-nav .nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const targetView = item.dataset.view;
        this.switchView(targetView);
      });
    });
  }

  switchView(viewId) {
    this.currentView = viewId;

    // Actualizar vistas
    document.querySelectorAll('.app-view').forEach(view => {
      view.classList.remove('is-active');
    });
    const activeView = document.getElementById(viewId);
    if (activeView) activeView.classList.add('is-active');

    // Actualizar nav bar
    document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
      if (item.dataset.view === viewId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Scroll al inicio de la página
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Si entra a la vista de progreso, refrescar estadísticas
    if (viewId === 'view-progress') {
      this.updateStatsView();
    }
  }

  // ==========================================
  // RENDERIZADO DE RUTINAS
  // ==========================================
  renderRoutines() {
    const container = document.getElementById('routines-list-container');
    if (!container) return;

    container.innerHTML = ROUTINES.map(routine => {
      const exerciseNames = routine.exercises.map(item => {
        const ex = EXERCISES.find(e => e.id === item.exerciseId);
        return ex ? ex.name.split(' ')[0] + ' ' + (ex.name.split(' ')[1] || '') : item.exerciseId;
      });

      return `
        <article class="routine-card" data-routine-id="${routine.id}">
          <div class="routine-top-row">
            <span class="routine-difficulty">${routine.difficulty}</span>
            <span class="routine-duration">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              ${routine.estimatedMinutes} min • ${routine.daysPerWeek}
            </span>
          </div>

          <h3 class="routine-name">${routine.name}</h3>
          <p class="routine-tagline">${routine.tagline}</p>

          <div class="routine-exercise-preview">
            ${exerciseNames.slice(0, 4).map(name => `<span class="preview-pill">${name}</span>`).join('')}
            ${exerciseNames.length > 4 ? `<span class="preview-pill">+${exerciseNames.length - 4} más</span>` : ''}
          </div>

          <div class="routine-card-actions">
            <span class="routine-ex-count">${routine.exercises.length} ejercicios con mancuernas</span>
            <button type="button" class="btn-start-routine" data-routine-id="${routine.id}">
              <span>Empezar</span>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </button>
          </div>
        </article>
      `;
    }).join('');

    // Eventos de inicio de rutina
    container.querySelectorAll('.btn-start-routine').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const routineId = btn.dataset.routineId;
        const routine = ROUTINES.find(r => r.id === routineId);
        if (routine) {
          this.workoutPlayer.start(routine);
        }
      });
    });

    container.querySelectorAll('.routine-card').forEach(card => {
      card.addEventListener('click', () => {
        const routineId = card.dataset.routineId;
        const routine = ROUTINES.find(r => r.id === routineId);
        if (routine) {
          this.workoutPlayer.start(routine);
        }
      });
    });
  }

  // ==========================================
  // RENDERIZADO DE BIBLIOTECA DE EJERCICIOS
  // ==========================================
  setupSearchAndFilters() {
    const searchInput = document.getElementById('exercise-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.renderExercises();
      });
    }

    const filterChips = document.querySelectorAll('#muscle-chips-bar .chip-btn');
    filterChips.forEach(chip => {
      chip.addEventListener('click', () => {
        filterChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.selectedCategory = chip.dataset.category;
        this.renderExercises();
      });
    });
  }

  renderExercises() {
    const container = document.getElementById('exercises-list-container');
    if (!container) return;

    const filtered = EXERCISES.filter(ex => {
      const matchesCategory = this.selectedCategory === 'todos' || ex.category === this.selectedCategory;
      const matchesSearch = !this.searchQuery || 
        ex.name.toLowerCase().includes(this.searchQuery) ||
        ex.subtitle.toLowerCase().includes(this.searchQuery) ||
        ex.primaryMuscles.some(m => (MUSCLE_GROUPS[m]?.name || m).toLowerCase().includes(this.searchQuery));
      return matchesCategory && matchesSearch;
    });

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 40px 20px; color: var(--text-muted);">
          <p>No se encontraron ejercicios con ese criterio de búsqueda.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(exercise => {
      const animHtml = ExerciseAnimationRenderer.render(exercise.animationType, { exerciseId: exercise.id, isPaused: false });
      const primaryNames = exercise.primaryMuscles.map(m => MUSCLE_GROUPS[m]?.name || m).join(', ');

      return `
        <article class="exercise-card" data-exercise-id="${exercise.id}">
          <div class="card-anim-preview">
            ${animHtml}
          </div>

          <div class="exercise-card-body">
            <div class="exercise-card-header">
              <h3 class="exercise-card-title">${exercise.name}</h3>
              <span class="exercise-category-pill">${exercise.category}</span>
            </div>
            <p class="exercise-card-subtitle">${exercise.subtitle}</p>

            <div class="exercise-muscles-chips">
              <span class="muscle-badge badge-primary">
                <span class="badge-dot"></span>${primaryNames}
              </span>
            </div>
          </div>
        </article>
      `;
    }).join('');

    // Eventos de clic en tarjeta para abrir modal de detalle
    container.querySelectorAll('.exercise-card').forEach(card => {
      card.addEventListener('click', () => {
        const exerciseId = card.dataset.exerciseId;
        this.openExerciseModal(exerciseId);
      });
    });
  }

  // ==========================================
  // MODAL DE DETALLE DE EJERCICIO
  // ==========================================
  openExerciseModal(exerciseId) {
    const exercise = EXERCISES.find(e => e.id === exerciseId);
    if (!exercise) return;

    const modal = document.getElementById('exercise-detail-modal');
    const titleEl = document.getElementById('modal-ex-title');
    const subEl = document.getElementById('modal-ex-subtitle');
    const contentEl = document.getElementById('modal-ex-content');

    titleEl.textContent = exercise.name;
    subEl.textContent = `${exercise.equipment} • Nivel ${exercise.difficulty}`;

    const animHtml = ExerciseAnimationRenderer.render(exercise.animationType, { exerciseId: exercise.id });
    const muscleMapHtml = MuscleMap.render({
      primaryMuscles: exercise.primaryMuscles,
      secondaryMuscles: exercise.secondaryMuscles,
      view: 'both'
    });
    const muscleLegendHtml = MuscleMap.renderLegend(exercise.primaryMuscles, exercise.secondaryMuscles);

    contentEl.innerHTML = `
      <!-- Ilustración Animada Vectorial -->
      <div class="modal-section">
        <h4 class="modal-section-title">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
          Animación de Ejecución en Casa
        </h4>
        <div style="margin-top: 8px;">
          ${animHtml}
        </div>
      </div>

      <!-- Mapa Muscular Anatómico con Resaltado -->
      <div class="modal-section">
        <h4 class="modal-section-title">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          Músculos Activados (Frontal & Dorsal)
        </h4>
        <div style="margin-top: 10px;">
          ${muscleMapHtml}
          ${muscleLegendHtml}
        </div>
      </div>

      <!-- Paso a Paso de Ejecución -->
      <div class="modal-section">
        <h4 class="modal-section-title">Paso a Paso con Mancuernas</h4>
        <ol class="instructions-list">
          ${exercise.execution.map(step => `<li>${step}</li>`).join('')}
        </ol>
      </div>

      <!-- Consejo Clave -->
      <div class="player-tips-box">
        <div class="tip-title">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          Consejo de Oro en Casa
        </div>
        <p class="tip-text">${exercise.tips}</p>
      </div>

      <!-- Errores Comunes a Evitar -->
      ${exercise.mistakes && exercise.mistakes.length ? `
        <div class="mistakes-box">
          <div class="mistakes-title">⚠️ Errores frecuentes a evitar:</div>
          <ul class="mistakes-list">
            ${exercise.mistakes.map(m => `<li>${m}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
    `;

    modal.classList.add('is-active');
    document.body.style.overflow = 'hidden';
  }

  setupExerciseModalEvents() {
    const modal = document.getElementById('exercise-detail-modal');
    const btnClose = document.getElementById('btn-close-exercise-modal');
    const dragHandle = document.getElementById('modal-drag-handle');

    const closeModal = () => {
      modal.classList.remove('is-active');
      document.body.style.overflow = '';
    };

    if (btnClose) btnClose.addEventListener('click', closeModal);
    if (dragHandle) dragHandle.addEventListener('click', closeModal);

    // Clic fuera del contenido para cerrar
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
  }

  // ==========================================
  // SECCIÓN INTERACTIVA DE ANATOMÍA
  // ==========================================
  renderAnatomySection() {
    const selectorContainer = document.getElementById('anatomy-muscle-selector');
    const displayContainer = document.getElementById('anatomy-interactive-display');
    if (!selectorContainer || !displayContainer) return;

    // Chips de selección de músculos
    const muscles = [
      { id: 'chest', name: 'Pecho (Pectoral)' },
      { id: 'deltoids_lat', name: 'Deltoides Lateral' },
      { id: 'deltoids_ant', name: 'Deltoides Anterior' },
      { id: 'deltoids_post', name: 'Deltoides Posterior' },
      { id: 'lats', name: 'Dorsal Ancho (Espalda)' },
      { id: 'traps', name: 'Trapecio' },
      { id: 'biceps', name: 'Bíceps Braquial' },
      { id: 'triceps', name: 'Tríceps' },
      { id: 'core', name: 'Core / Abdominales' }
    ];

    selectorContainer.innerHTML = muscles.map((m, idx) => `
      <button class="chip-btn ${m.id === this.selectedMuscleAnatomy ? 'active' : ''}" data-muscle-id="${m.id}">
        ${m.name}
      </button>
    `).join('');

    selectorContainer.querySelectorAll('.chip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        selectorContainer.querySelectorAll('.chip-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedMuscleAnatomy = btn.dataset.muscleId;
        this.updateAnatomyView();
      });
    });

    this.updateAnatomyView();
  }

  updateAnatomyView() {
    const displayContainer = document.getElementById('anatomy-interactive-display');
    const titleEl = document.getElementById('anatomy-selected-title');
    const descEl = document.getElementById('anatomy-selected-desc');
    const relatedList = document.getElementById('anatomy-related-exercises');
    if (!displayContainer) return;

    const muscleId = this.selectedMuscleAnatomy;
    const muscleInfo = MUSCLE_GROUPS[muscleId] || { name: muscleId };

    // Renderizar silueta con ese músculo resaltado
    displayContainer.innerHTML = MuscleMap.render({
      primaryMuscles: [muscleId],
      secondaryMuscles: [],
      view: 'both',
      interactive: true
    });

    // Encontrar ejercicios con mancuernas para este músculo
    const related = EXERCISES.filter(ex => 
      ex.primaryMuscles.includes(muscleId) || ex.secondaryMuscles.includes(muscleId)
    );

    const descriptions = {
      chest: 'Músculo protagonista en empujes frontales (press en suelo, aperturas). Aporta grosor y amplitud al torso anterior.',
      deltoids_lat: 'Otorga la clásica forma en V y anchura a los hombros. Se estimula principalmente con elevaciones laterales.',
      deltoids_ant: 'Participa en empujes verticales (press militar) y de pecho. Soporta la elevación de cargas al frente.',
      deltoids_post: 'Clave para la postura erguida y protección de hombros. Se trabaja con pájaros y remos.',
      lats: 'El músculo más grande de la espalda superior. Da forma de abanico con remos y pullovers con mancuerna.',
      traps: 'Estabiliza el cuello y las escápulas. Se activa con encogimientos y remos altos.',
      biceps: 'Flexiona el codo y supina la muñeca. Se aisla con curls alternos, martillo y concentrados.',
      triceps: 'Constituye el 60% del volumen del brazo. Extiende el codo en presses franceses, copas y patadas.',
      core: 'Transmite la fuerza del tren superior y estabiliza la columna vertebral durante los levantamientos.'
    };

    titleEl.textContent = muscleInfo.name;
    descEl.textContent = descriptions[muscleId] || 'Músculo clave del tren superior estimulado con mancuernas.';

    relatedList.innerHTML = related.map(ex => `
      <div class="history-item" style="cursor: pointer;" data-ex-id="${ex.id}">
        <div>
          <div class="history-info-title">${ex.name}</div>
          <div class="history-info-date">${ex.equipment} • ${ex.difficulty}</div>
        </div>
        <span class="history-pill" style="color: var(--neon-cyan);">Ver Técnica →</span>
      </div>
    `).join('');

    relatedList.querySelectorAll('.history-item').forEach(item => {
      item.addEventListener('click', () => {
        const exId = item.dataset.exId;
        this.openExerciseModal(exId);
      });
    });
  }

  // ==========================================
  // VISTA DE PROGRESO Y ESTADÍSTICAS
  // ==========================================
  updateStatsView() {
    const stats = StorageManager.getStats();
    const history = StorageManager.getHistory();

    const elSessions = document.getElementById('metric-sessions');
    const elVolume = document.getElementById('metric-volume');
    const elMinutes = document.getElementById('metric-minutes');
    const elStreak = document.getElementById('metric-streak');
    const historyContainer = document.getElementById('history-list-container');

    if (elSessions) elSessions.textContent = stats.totalSessions;
    if (elVolume) elVolume.textContent = `${stats.totalVolumeKg.toLocaleString()} kg`;
    if (elMinutes) elMinutes.textContent = stats.totalMinutes;
    if (elStreak) elStreak.textContent = `${stats.streak} d`;

    if (historyContainer) {
      if (history.length === 0) {
        historyContainer.innerHTML = `
          <div style="text-align: center; padding: 30px 16px; color: var(--text-muted); background: var(--bg-surface); border-radius: var(--radius-md); border: 1px solid var(--border-glass);">
            <p>Aún no has completado entrenamientos.</p>
            <p style="font-size: 0.8rem; margin-top: 4px;">¡Inicia tu primera rutina en la pestaña de <strong>Rutinas</strong>!</p>
          </div>
        `;
      } else {
        historyContainer.innerHTML = history.slice(0, 10).map(item => {
          const dateObj = new Date(item.date);
          const dateStr = dateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
          const mins = Math.max(1, Math.round((item.durationSeconds || 0) / 60));

          return `
            <div class="history-item">
              <div>
                <div class="history-info-title">${item.routineName || 'Entrenamiento Libre'}</div>
                <div class="history-info-date">${dateStr} • ${mins} min</div>
              </div>
              <div class="history-badges">
                <span class="history-pill">${item.totalVolume || 0} kg</span>
                <span class="history-pill" style="color: var(--neon-emerald);">${item.completedSets || 0} series</span>
              </div>
            </div>
          `;
        }).join('');
      }
    }
  }

  updateStreakBadge() {
    const streakPillText = document.getElementById('streak-counter-text');
    if (streakPillText) {
      const stats = StorageManager.getStats();
      streakPillText.textContent = `${stats.streak} Días`;
    }
  }
}

// Arrancar aplicación al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
  window.appInstance = new App();
});
