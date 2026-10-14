// Generador interactivo de mapa muscular anatómico en SVG (Frontal y Posterior)
import { MUSCLE_GROUPS } from './exercises-data.js';

export class MuscleMap {
  /**
   * Genera el SVG del mapa muscular
   * @param {Object} options
   * @param {string[]} options.primaryMuscles - IDs de músculos primarios
   * @param {string[]} options.secondaryMuscles - IDs de músculos secundarios
   * @param {string} options.view - 'front', 'back' o 'both'
   * @param {boolean} options.interactive - Si permite hacer clic en músculos
   * @param {string} options.containerClass - Clases adicionales
   */
  static render({
    primaryMuscles = [],
    secondaryMuscles = [],
    view = 'both',
    interactive = false,
    width = 300,
    height = 240
  } = {}) {
    const isPrimary = (id) => primaryMuscles.includes(id);
    const isSecondary = (id) => secondaryMuscles.includes(id);

    const getMuscleClass = (id) => {
      let cls = `muscle-part muscle-${id}`;
      if (isPrimary(id)) cls += ' is-primary';
      else if (isSecondary(id)) cls += ' is-secondary';
      else cls += ' is-neutral';
      if (interactive) cls += ' is-clickable';
      return cls;
    };

    const frontSvg = `
      <svg class="anatomy-svg anatomy-front" viewBox="0 0 200 240" preserveAspectRatio="xMidYMid meet">
        <defs>
          <filter id="glow-primary" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <!-- Silueta base de fondo -->
        <g class="body-base">
          <!-- Cabeza y cuello -->
          <ellipse cx="100" cy="24" rx="14" ry="18" class="body-silhouette head" />
          <path d="M92 40 L92 52 L108 52 L108 40 Z" class="body-silhouette neck" />

          <!-- Clavículas / hombros contorno -->
          <path d="M80 50 Q100 56 120 50" class="bone-line" />
        </g>

        <!-- Deltoides Anterior y Lateral (Frontal) -->
        <!-- Hombro Izquierdo (del observador) -->
        <path d="M78 50 C65 52 52 64 54 82 C55 92 65 92 72 84 C76 78 78 68 80 55 Z" 
              class="${getMuscleClass('deltoids_lat')}" data-muscle="deltoids_lat" data-name="Deltoides Lateral (Izq)">
          <title>Deltoides Lateral</title>
        </path>
        <path d="M76 53 C70 58 64 70 69 82 C74 76 77 66 79 55 Z" 
              class="${getMuscleClass('deltoids_ant')}" data-muscle="deltoids_ant" data-name="Deltoides Anterior (Izq)">
          <title>Deltoides Anterior</title>
        </path>

        <!-- Hombro Derecho (del observador) -->
        <path d="M122 50 C135 52 148 64 146 82 C145 92 135 92 128 84 C124 78 122 68 120 55 Z" 
              class="${getMuscleClass('deltoids_lat')}" data-muscle="deltoids_lat" data-name="Deltoides Lateral (Der)">
          <title>Deltoides Lateral</title>
        </path>
        <path d="M124 53 C130 58 136 70 131 82 C126 76 123 66 121 55 Z" 
              class="${getMuscleClass('deltoids_ant')}" data-muscle="deltoids_ant" data-name="Deltoides Anterior (Der)">
          <title>Deltoides Anterior</title>
        </path>

        <!-- Bíceps Braquial (Frontal) -->
        <!-- Brazo Izquierdo -->
        <path d="M54 84 C50 96 52 114 59 124 C64 122 68 116 68 100 C68 90 62 84 54 84 Z" 
              class="${getMuscleClass('biceps')}" data-muscle="biceps" data-name="Bíceps (Brazo Izq)">
          <title>Bíceps Braquial</title>
        </path>
        <!-- Brazo Derecho -->
        <path d="M146 84 C150 96 148 114 141 124 C136 122 132 116 132 100 C132 90 138 84 146 84 Z" 
              class="${getMuscleClass('biceps')}" data-muscle="biceps" data-name="Bíceps (Brazo Der)">
          <title>Bíceps Braquial</title>
        </path>

        <!-- Antebrazos (Frontal) -->
        <path d="M57 125 C48 138 42 160 48 174 C54 174 58 160 62 140 C63 132 60 126 57 125 Z" 
              class="${getMuscleClass('forearms')}" data-muscle="forearms" data-name="Antebrazo (Izq)">
          <title>Antebrazos</title>
        </path>
        <path d="M143 125 C152 138 158 160 152 174 C146 174 142 160 138 140 C137 132 140 126 143 125 Z" 
              class="${getMuscleClass('forearms')}" data-muscle="forearms" data-name="Antebrazo (Der)">
          <title>Antebrazos</title>
        </path>

        <!-- Pecho / Pectoral Mayor (Izquierdo y Derecho) -->
        <g class="muscle-group-chest">
          <!-- Pectoral Izquierdo (del observador) -->
          <path d="M98 55 C90 55 81 57 78 64 C76 74 80 88 92 90 C96 90 98 88 98 78 Z" 
                class="${getMuscleClass('chest')}" data-muscle="chest" data-name="Pectoral Izquierdo">
            <title>Pecho (Pectoral Mayor)</title>
          </path>
          <!-- Pectoral Derecho (del observador) -->
          <path d="M102 55 C110 55 119 57 122 64 C124 74 120 88 108 90 C104 90 102 88 102 78 Z" 
                class="${getMuscleClass('chest')}" data-muscle="chest" data-name="Pectoral Derecho">
            <title>Pecho (Pectoral Mayor)</title>
          </path>
        </g>

        <!-- Core / Abdominales (Recto abdominal y oblicuos) -->
        <g class="muscle-group-core">
          <!-- Cuadricula Abdominal -->
          <path d="M90 95 C92 94 98 94 98 106 C94 106 90 104 90 95 Z" class="${getMuscleClass('core')}" data-muscle="core"/>
          <path d="M110 95 C108 94 102 94 102 106 C106 106 110 104 110 95 Z" class="${getMuscleClass('core')}" data-muscle="core"/>
          
          <path d="M90 108 C92 107 98 107 98 120 C94 120 90 118 90 108 Z" class="${getMuscleClass('core')}" data-muscle="core"/>
          <path d="M110 108 C108 107 102 107 102 120 C106 120 110 118 110 108 Z" class="${getMuscleClass('core')}" data-muscle="core"/>

          <path d="M90 122 C92 121 98 121 98 138 C93 136 90 132 90 122 Z" class="${getMuscleClass('core')}" data-muscle="core"/>
          <path d="M110 122 C108 121 102 121 102 138 C107 136 110 132 110 122 Z" class="${getMuscleClass('core')}" data-muscle="core"/>

          <!-- Oblicuos -->
          <path d="M80 94 C85 96 88 106 88 126 C82 130 76 130 74 122 C74 106 78 96 80 94 Z" 
                class="${getMuscleClass('core')}" data-muscle="core" data-name="Oblicuos">
            <title>Core y Oblicuos</title>
          </path>
          <path d="M120 94 C115 96 112 106 112 126 C118 130 124 130 126 122 C126 106 122 96 120 94 Z" 
                class="${getMuscleClass('core')}" data-muscle="core" data-name="Oblicuos">
            <title>Core y Oblicuos</title>
          </path>
        </g>

        <!-- Cadera / Base inferior sutil -->
        <path d="M72 135 C82 142 118 142 128 135 L124 165 C116 168 84 168 76 165 Z" class="body-silhouette pelvis" />
      </svg>
    `;

    const backSvg = `
      <svg class="anatomy-svg anatomy-back" viewBox="0 0 200 240" preserveAspectRatio="xMidYMid meet">
        <!-- Silueta base de fondo -->
        <g class="body-base">
          <!-- Cabeza y cuello dorsal -->
          <ellipse cx="100" cy="24" rx="14" ry="18" class="body-silhouette head" />
          <path d="M91 38 L91 50 L109 50 L109 38 Z" class="body-silhouette neck" />
        </g>

        <!-- Trapecio (Traps) -->
        <g class="muscle-group-traps">
          <path d="M92 48 L100 44 L108 48 L126 62 L100 95 L74 62 Z" 
                class="${getMuscleClass('traps')}" data-muscle="traps" data-name="Trapecio (Superior y Medio)">
            <title>Trapecio</title>
          </path>
        </g>

        <!-- Deltoides Posterior (Dorsal) -->
        <!-- Izquierdo del observador -->
        <path d="M74 54 C60 58 52 70 54 84 C62 86 70 80 74 70 Z" 
              class="${getMuscleClass('deltoids_post')}" data-muscle="deltoids_post" data-name="Deltoides Posterior (Izq)">
          <title>Deltoides Posterior</title>
        </path>
        <!-- Derecho del observador -->
        <path d="M126 54 C140 58 148 70 146 84 C138 86 130 80 126 70 Z" 
              class="${getMuscleClass('deltoids_post')}" data-muscle="deltoids_post" data-name="Deltoides Posterior (Der)">
          <title>Deltoides Posterior</title>
        </path>

        <!-- Tríceps (Dorsal) -->
        <!-- Brazo Izquierdo -->
        <path d="M53 85 C48 98 48 116 56 125 C62 122 66 112 66 98 C66 90 60 85 53 85 Z" 
              class="${getMuscleClass('triceps')}" data-muscle="triceps" data-name="Tríceps (Brazo Izq)">
          <title>Tríceps</title>
        </path>
        <!-- Brazo Derecho -->
        <path d="M147 85 C152 98 152 116 144 125 C138 122 134 112 134 98 C134 90 140 85 147 85 Z" 
              class="${getMuscleClass('triceps')}" data-muscle="triceps" data-name="Tríceps (Brazo Der)">
          <title>Tríceps</title>
        </path>

        <!-- Antebrazo Dorsal -->
        <path d="M55 126 C47 138 41 160 47 174 C53 174 57 160 61 140 C62 132 58 126 55 126 Z" 
              class="${getMuscleClass('forearms')}" data-muscle="forearms">
          <title>Antebrazos</title>
        </path>
        <path d="M145 126 C153 138 159 160 153 174 C147 174 143 160 139 140 C138 132 142 126 145 126 Z" 
              class="${getMuscleClass('forearms')}" data-muscle="forearms">
          <title>Antebrazos</title>
        </path>

        <!-- Romboides (Escápulas) -->
        <path d="M82 66 L96 74 L96 90 L82 82 Z" class="${getMuscleClass('rhomboids')}" data-muscle="rhomboids" data-name="Romboides">
          <title>Romboides</title>
        </path>
        <path d="M118 66 L104 74 L104 90 L118 82 Z" class="${getMuscleClass('rhomboids')}" data-muscle="rhomboids" data-name="Romboides">
          <title>Romboides</title>
        </path>

        <!-- Dorsal Ancho (Lats) -->
        <g class="muscle-group-lats">
          <!-- Dorsal Izquierdo -->
          <path d="M74 72 C68 84 68 106 75 124 C82 125 90 120 95 102 C97 94 92 82 86 74 Z" 
                class="${getMuscleClass('lats')}" data-muscle="lats" data-name="Dorsal Ancho (Izq)">
            <title>Dorsal Ancho (Lats)</title>
          </path>
          <!-- Dorsal Derecho -->
          <path d="M126 72 C132 84 132 106 125 124 C118 125 110 120 105 102 C103 94 108 82 114 74 Z" 
                class="${getMuscleClass('lats')}" data-muscle="lats" data-name="Dorsal Ancho (Der)">
            <title>Dorsal Ancho (Lats)</title>
          </path>
        </g>

        <!-- Zona Lumbar / Espinales (Lower Back) -->
        <path d="M92 105 L98 105 L98 135 L90 135 Z" class="${getMuscleClass('lower_back')}" data-muscle="lower_back">
          <title>Zona Lumbar</title>
        </path>
        <path d="M108 105 L102 105 L102 135 L110 135 Z" class="${getMuscleClass('lower_back')}" data-muscle="lower_back">
          <title>Zona Lumbar</title>
        </path>

        <!-- Glúteos y base dorsal sutil -->
        <path d="M74 136 C82 144 118 144 126 136 L124 165 C116 170 84 170 76 165 Z" class="body-silhouette pelvis" />
      </svg>
    `;

    if (view === 'front') {
      return `<div class="muscle-map-wrapper view-front">${frontSvg}<div class="map-label">Vista Frontal</div></div>`;
    }
    if (view === 'back') {
      return `<div class="muscle-map-wrapper view-back">${backSvg}<div class="map-label">Vista Posterior</div></div>`;
    }

    return `
      <div class="muscle-map-dual-container">
        <div class="muscle-map-card">
          ${frontSvg}
          <div class="map-label">Frontal</div>
        </div>
        <div class="muscle-map-card">
          ${backSvg}
          <div class="map-label">Espalda</div>
        </div>
      </div>
    `;
  }

  /**
   * Genera la leyenda de músculos activa con chips de color
   */
  static renderLegend(primaryMuscles = [], secondaryMuscles = []) {
    const primaryChips = primaryMuscles.map(id => {
      const info = MUSCLE_GROUPS[id] || { name: id };
      return `<span class="muscle-badge badge-primary"><span class="badge-dot"></span>${info.name}</span>`;
    }).join('');

    const secondaryChips = secondaryMuscles.map(id => {
      const info = MUSCLE_GROUPS[id] || { name: id };
      return `<span class="muscle-badge badge-secondary"><span class="badge-dot"></span>${info.name}</span>`;
    }).join('');

    return `
      <div class="muscle-legend-bar">
        ${primaryMuscles.length ? `
          <div class="legend-group">
            <span class="legend-type-title">Principal:</span>
            <div class="legend-badges">${primaryChips}</div>
          </div>
        ` : ''}
        ${secondaryMuscles.length ? `
          <div class="legend-group">
            <span class="legend-type-title">Secundario:</span>
            <div class="legend-badges">${secondaryChips}</div>
          </div>
        ` : ''}
      </div>
    `;
  }
}
