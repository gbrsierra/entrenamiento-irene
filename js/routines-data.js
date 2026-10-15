// Rutinas y Planes 100% PARA CASA CON MANCUERNAS (CERO BANCO)
export const ROUTINES = [
  {
    id: 'dia-1-fuerza-tren-superior-cardio',
    name: 'DIA 1 - FUERZA TREN SUPERIOR + CARDIO',
    tagline: 'Fuerza tren superior + cardio intervalos',
    difficulty: 'Intermedio',
    estimatedMinutes: 45,
    daysPerWeek: '1 a 2 días',
    target: 'Fuerza de torso, brazos y acondicionamiento cardiovascular a intervalos',
    description: 'Bloque: DIA 1 - FUERZA TREN SUPERIOR + CARDIO con 6 ejercicios: 1. Press de pecho con mancuernas, 2. Remo con mancuerna a una mano, 3. Press militar sentado, 4. Curl de bíceps con mancuernas, 5. Tríceps con mancuerna y 6. Bicicleta estática a intervalos.',
    exercises: [
      { exerciseId: 'press-pecho-mancuernas', sets: 4, reps: 10, restSeconds: 75 },
      { exerciseId: 'remo-unilateral-mancuerna', sets: 4, reps: 10, restSeconds: 60 },
      { exerciseId: 'press-militar-sentado', sets: 3, reps: 10, restSeconds: 60 },
      { exerciseId: 'curl-biceps-mancuernas', sets: 3, reps: 12, restSeconds: 60 },
      { exerciseId: 'triceps-mancuerna', sets: 3, reps: 12, restSeconds: 60 },
      { exerciseId: 'bicicleta-estatica-intervalos', sets: 1, reps: 900, restSeconds: 0 }
    ]
  },
  {
    id: 'dia-2-fuerza-tren-inferior-cardio-moderado',
    name: 'DIA 2 - FUERZA TREN INFERIOR + CARDIO MODERADO',
    tagline: 'Fuerza tren inferior + cardio continuo',
    difficulty: 'Intermedio',
    estimatedMinutes: 50,
    daysPerWeek: '1 a 2 días',
    target: 'Cuádriceps, glúteos, isquiotibiales, gemelos y capacidad aeróbica',
    description: 'Bloque: DIA 2 - FUERZA TREN INFERIOR + CARDIO MODERADO con 6 ejercicios en orden: 1. Sentadillas con mancuernas, 2. Zancadas alternas con mancuernas, 3. Puente de glúteos con mancuernas, 4. Peso muerto rumano con mancuernas, 5. Elevación de gemelos con mancuernas y 6. Bicicleta estática.',
    exercises: [
      { exerciseId: 'sentadillas-con-mancuernas', sets: 4, reps: 12, restSeconds: 60 },
      { exerciseId: 'zancadas-alternas-mancuernas', sets: 4, reps: 12, restSeconds: 60 },
      { exerciseId: 'puente-gluteos-mancuernas', sets: 4, reps: 15, restSeconds: 60 },
      { exerciseId: 'peso-muerto-rumano-mancuernas', sets: 4, reps: 12, restSeconds: 60 },
      { exerciseId: 'elevacion-gemelos-mancuernas', sets: 4, reps: 15, restSeconds: 45 },
      { exerciseId: 'bicicleta_estatica', sets: 1, reps: 900, restSeconds: 0 }
    ]
  },
  {
    id: 'dia-3-full-body-cardio-suave',
    name: 'DIA 3 - FULL BODY + CARDIO SUAVE',
    tagline: 'Fuerza y Tonificación Full Body + Cardio',
    difficulty: 'Intermedio',
    estimatedMinutes: 45,
    daysPerWeek: '1 día',
    target: 'Entrenamiento mixto con mancuernas y cardio suave',
    description: 'Bloque: DIA 3 - FULL BODY + CARDIO SUAVE con 6 ejercicios: 1. Remo inclinado a una mano (apoyo en rodilla), 2. Flexiones de brazos, 3. Sentadilla goblet con mancuerna, 4. Hip Thrust con mancuerna, 5. Remo inclinado de pie con mancuernas y 6. Bicicleta estática.',
    exercises: [
      { exerciseId: 'remo_inclinado_apoyo', sets: 4, reps: 12, restSeconds: 60 },
      { exerciseId: 'flexiones_rodillas', sets: 3, reps: 10, restSeconds: 60 },
      { exerciseId: 'sentadilla_goblet', sets: 4, reps: 12, restSeconds: 60 },
      { exerciseId: 'hip_thrust', sets: 4, reps: 15, restSeconds: 60 },
      { exerciseId: 'remo-dos-mancuernas', sets: 4, reps: 10, restSeconds: 60 },
      { exerciseId: 'bicicleta_estatica', sets: 1, reps: 900, restSeconds: 0 }
    ]
  }
];



