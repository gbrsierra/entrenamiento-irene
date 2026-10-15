// Gestor de persistencia en LocalStorage y estadísticas
const STORAGE_KEYS = {
  HISTORY: 'ironupper_history',
  CUSTOM_ROUTINES: 'ironupper_custom_routines',
  EXERCISE_LOGS: 'ironupper_exercise_logs',
  SETTINGS: 'ironupper_settings',
  ACTIVE_SESSION: 'ironupper_active_session'
};

export class StorageManager {
  /**
   * Obtiene la configuración de usuario
   */
  static getSettings() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? JSON.parse(data) : {
        unit: 'kg',
        sound: true,
        vibration: true,
        restDefault: 60
      };
    } catch {
      return { unit: 'kg', sound: true, vibration: true, restDefault: 60 };
    }
  }

  /**
   * Guarda ajustes de usuario
   */
  static saveSettings(settings) {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.warn('Error guardando ajustes', e);
    }
  }

  /**
   * Obtiene el historial de entrenamientos completados
   */
  static getHistory() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  /**
   * Registra un entrenamiento completado
   */
  static recordWorkout(workoutRecord) {
    try {
      const history = this.getHistory();
      const record = {
        id: 'w_' + Date.now(),
        date: new Date().toISOString(),
        ...workoutRecord
      };
      history.unshift(record);
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));

      // Actualizar también último peso por ejercicio
      if (workoutRecord.exerciseRecords) {
        this.updateExerciseRecords(workoutRecord.exerciseRecords);
      }

      return record;
    } catch (e) {
      console.warn('Error registrando entrenamiento', e);
      return null;
    }
  }

  /**
   * Actualiza el último peso registrado para cada ejercicio
   */
  static updateExerciseRecords(exerciseRecords) {
    try {
      const logs = this.getExerciseLogs();
      Object.entries(exerciseRecords).forEach(([exerciseId, data]) => {
        logs[exerciseId] = {
          lastWeight: data.lastWeight || 0,
          lastReps: data.lastReps || 0,
          date: new Date().toISOString()
        };
      });
      localStorage.setItem(STORAGE_KEYS.EXERCISE_LOGS, JSON.stringify(logs));
    } catch (e) {
      console.warn('Error guardando pesos por ejercicio', e);
    }
  }

  /**
   * Obtiene el historial por ejercicio
   */
  static getExerciseLogs() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.EXERCISE_LOGS);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }

  /**
   * Obtiene el último peso usado para un ejercicio
   */
  static getLastWeightForExercise(exerciseId) {
    const logs = this.getExerciseLogs();
    return (logs[exerciseId] && logs[exerciseId].lastWeight !== undefined) ? logs[exerciseId].lastWeight : 10;
  }

  /**
   * Guarda o actualiza parámetros de un ejercicio (peso, repeticiones, tiempo de descanso)
   * para que permanezca el último cambio hasta que se vuelva a cambiar.
   */
  static saveExerciseParam(exerciseId, params = {}) {
    try {
      const logs = this.getExerciseLogs();
      logs[exerciseId] = {
        ...(logs[exerciseId] || {}),
        ...params,
        date: new Date().toISOString()
      };
      if (params.weight !== undefined) logs[exerciseId].lastWeight = params.weight;
      if (params.reps !== undefined) logs[exerciseId].lastReps = params.reps;
      if (params.restSeconds !== undefined) logs[exerciseId].restSeconds = params.restSeconds;
      localStorage.setItem(STORAGE_KEYS.EXERCISE_LOGS, JSON.stringify(logs));
    } catch (e) {
      console.warn('Error guardando configuración de ejercicio', e);
    }
  }

  /**
   * Obtiene la configuración personalizada guardada para un ejercicio
   */
  static getExerciseConfig(exerciseId) {
    const logs = this.getExerciseLogs();
    return logs[exerciseId] || {};
  }

  /**
   * Obtiene rutinas personalizadas del usuario
   */
  static getCustomRoutines() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CUSTOM_ROUTINES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  /**
   * Guarda una nueva rutina personalizada
   */
  static saveCustomRoutine(routine) {
    try {
      const list = this.getCustomRoutines();
      routine.id = routine.id || 'custom_' + Date.now();
      routine.isCustom = true;
      const index = list.findIndex(r => r.id === routine.id);
      if (index >= 0) {
        list[index] = routine;
      } else {
        list.push(routine);
      }
      localStorage.setItem(STORAGE_KEYS.CUSTOM_ROUTINES, JSON.stringify(list));
      return routine;
    } catch (e) {
      console.warn('Error guardando rutina personalizada', e);
      return null;
    }
  }

  /**
   * Elimina una rutina personalizada
   */
  static deleteCustomRoutine(routineId) {
    try {
      let list = this.getCustomRoutines();
      list = list.filter(r => r.id !== routineId);
      localStorage.setItem(STORAGE_KEYS.CUSTOM_ROUTINES, JSON.stringify(list));
    } catch (e) {
      console.warn('Error eliminando rutina', e);
    }
  }

  /**
   * Calcula estadísticas generales (racha, volumen total acumulado, sesiones totales)
   */
  static getStats() {
    const history = this.getHistory();
    const totalSessions = history.length;
    let totalVolumeKg = 0;
    let totalSeconds = 0;

    history.forEach(item => {
      totalVolumeKg += (item.totalVolume || 0);
      totalSeconds += (item.durationSeconds || 0);
    });

    // Calcular racha de días actuales
    const streak = this.calculateStreak(history);

    return {
      totalSessions,
      totalVolumeKg: Math.round(totalVolumeKg),
      totalMinutes: Math.round(totalSeconds / 60),
      streak
    };
  }

  /**
   * Cálculo de racha consecutiva de entrenamiento
   */
  static calculateStreak(history) {
    if (!history.length) return 0;
    
    // Obtener días únicos formateados como YYYY-MM-DD
    const daysSet = new Set(history.map(item => item.date.slice(0, 10)));
    const today = new Date();
    let current = new Date(today);
    let streakCount = 0;

    // Verificar si hoy o ayer se entrenó
    const todayStr = current.toISOString().slice(0, 10);
    current.setDate(current.getDate() - 1);
    const yesterdayStr = current.toISOString().slice(0, 10);

    let checkDate = new Date(today);
    if (!daysSet.has(todayStr) && !daysSet.has(yesterdayStr)) {
      return 0; // Se rompió la racha
    }

    if (!daysSet.has(todayStr)) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (daysSet.has(checkDate.toISOString().slice(0, 10))) {
      streakCount++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    return streakCount;
  }
}
