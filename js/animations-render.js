// Renderizador de animaciones anatómicas 3D (estilo modelo muscular con músculo en rojo)
// GIFs anatómicos 3D interactivos tanto para el entrenamiento de Irene como el de Gabriel
export class ExerciseAnimationRenderer {
  /**
   * Genera la animación anatómica 3D del ejercicio (GIF 3D muscular animado)
   * @param {string} animationType - Tipo o ID de animación
   * @param {Object} options
   * @param {string} options.exerciseId - ID del ejercicio para cargar su animación anatómica local
   * @param {boolean} options.isPaused - Si la animación está pausada
   */
  static render(animationType, { exerciseId = null, isPaused = false } = {}) {
    const id = exerciseId || animationType;

    // ── Mapeo de alias a nombres de archivo de GIFs 3D ──────────────────────
    const aliasMap = {
      'plank': 'plancha-abdominal',
      'floor_press': 'press-banca-suelo',
      'hex_press': 'press-svend-mancuerna',
      'bent_row': 'remo-dos-mancuernas',
      'single_row': 'remo-unilateral-mancuerna',
      'upright_row': 'remo-al-menton',
      'overhead_press': 'press-militar-mancuernas',
      'lateral_raises': 'elevaciones-laterales',
      'front_raises': 'elevaciones-frontales',
      'rear_delt_flyes': 'pajaros-deltoides-posterior',
      'biceps_curl': 'curl-biceps-supino',
      'hammer_curl': 'curl-martillo',
      'overhead_triceps': 'extension-copa-triceps',
      'triceps_kickback': 'patada-triceps',
      'shrugs': 'encogimientos-hombros',
      'russian_twists': 'giros-rusos-mancuerna',
      'remo_inclinado_apoyo': 'remo_inclinado_apoyo',
      'flexiones_rodillas': 'flexiones_rodillas',
      'sentadilla_goblet': 'sentadilla_goblet',
      'hip_thrust': 'hip_thrust',
      'face_pull_banda': 'face_pull_banda',
      'bicicleta_estatica': 'bicicleta_estatica',
      'press-pecho-mancuernas': 'press-pecho-mancuernas',
      'press-militar-sentado': 'press-militar-sentado',
      'curl-biceps-mancuernas': 'curl-biceps-mancuernas',
      'triceps-mancuerna': 'triceps-mancuerna',
      'bicicleta-estatica-intervalos': 'bicicleta-estatica-intervalos',
      'remo-dos-mancuernas': 'remo-dos-mancuernas',
      'sentadillas-con-mancuernas': 'sentadillas-con-mancuernas',
      'zancadas-alternas-mancuernas': 'zancadas-alternas-mancuernas',
      'puente-gluteos-mancuernas': 'puente-gluteos-mancuernas',
      'peso-muerto-rumano-mancuernas': 'peso-muerto-rumano-mancuernas',
      'elevacion-gemelos-mancuernas': 'elevacion-gemelos-mancuernas'
    };

    const fileId = aliasMap[id] || id;
    const imgPath = `assets/exercises/${fileId}.gif`;

    return `
      <div class="anim-viewport anim-3d-card ${isPaused ? 'is-paused' : ''}">
        <div class="anim-3d-inner">
          <img
            src="${imgPath}"
            alt="Demostración anatómica 3D animada del ejercicio"
            class="anim-3d-gif"
            loading="lazy"
            onerror="this.parentElement.innerHTML='<div class=\\'anim-fallback-box\\'>Demostración Técnica 3D</div>'"
          />
        </div>
      </div>
    `;
  }
}
