// Rutinas y Planes 100% PARA CASA CON MANCUERNAS (CERO BANCO)
export const ROUTINES = [
  {
    id: 'entrenamiento-irene-dia-1',
    name: 'Irene - dia 1',
    tagline: 'Fuerza y Tonificación (Basado en PDF)',
    difficulty: 'Intermedio',
    estimatedMinutes: 45,
    daysPerWeek: '1 día',
    target: 'Entrenamiento mixto con mancuernas, bandas y cardio',
    description: 'Bloque de entrenamientos que se llame: Irene - dia 1.',
    exercises: [
      { exerciseId: 'remo_inclinado_apoyo', sets: 4, reps: 12, restSeconds: 60 },
      { exerciseId: 'flexiones_rodillas', sets: 3, reps: 10, restSeconds: 60 },
      { exerciseId: 'sentadilla_goblet', sets: 4, reps: 12, restSeconds: 60 },
      { exerciseId: 'hip_thrust', sets: 4, reps: 15, restSeconds: 60 },
      { exerciseId: 'face_pull_banda', sets: 3, reps: 15, restSeconds: 60 },
      { exerciseId: 'bicicleta_estatica', sets: 1, reps: 900, restSeconds: 0 }
    ]
  },
  {
    id: 'entrenamiento-personalizado-gabriel',
    name: 'Irene- dia 2',
    tagline: 'Fuerza tren superior + cardio intervalos',
    difficulty: 'Intermedio',
    estimatedMinutes: 45,
    daysPerWeek: '2 a 3 días',
    target: 'Fuerza de torso, brazos y acondicionamiento cardiovascular a intervalos',
    description: 'Bloque: Dia 2-Fuerza tren superior+ cardio intervalos con 6 ejercicios: 1. Press de pecho con mancuernas, 2. Remo con mancuerna a una mano, 3. Press militar sentado, 4. Curl de bíceps con mancuernas, 5. Tríceps con mancuerna y 6. Bicicleta estática a intervalos.',
    exercises: [
      { exerciseId: 'press-pecho-mancuernas', sets: 4, reps: 10, restSeconds: 75 },
      { exerciseId: 'remo-unilateral-mancuerna', sets: 4, reps: 10, restSeconds: 60 },
      { exerciseId: 'press-militar-sentado', sets: 3, reps: 10, restSeconds: 60 },
      { exerciseId: 'curl-biceps-mancuernas', sets: 3, reps: 12, restSeconds: 60 },
      { exerciseId: 'triceps-mancuerna', sets: 3, reps: 12, restSeconds: 60 },
      { exerciseId: 'bicicleta-estatica-intervalos', sets: 1, reps: 900, restSeconds: 0 }
    ]
  }
];


