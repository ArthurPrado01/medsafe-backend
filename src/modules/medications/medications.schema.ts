const FREQUENCIES = [
  'diario', 'duasVezesDia', 'tresVezesDia',
  'semanalDom', 'semanalSeg', 'semanalTer', 'semanalQua',
  'semanalQui', 'semanalSex', 'semanalSab',
  'quinzenal', 'mensal',
]

const ALERT_INTERVALS = ['cincoMin', 'dezMin', 'quinzeMin', 'trintaMin', 'umaHora']

const MAX_ATTEMPTS = ['uma', 'duas', 'tres', 'quatro', 'cinco']

export const createMedicationSchema = {
  body: {
    type: 'object',
    required: ['name', 'dose', 'time', 'frequency', 'alertInterval', 'maxAttempts'],
    properties: {
      name: { type: 'string', minLength: 1 },
      dose: { type: 'string', minLength: 1 },
      time: { type: 'string', pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$' },
      frequency: { type: 'string', enum: FREQUENCIES },
      alertInterval: { type: 'string', enum: ALERT_INTERVALS },
      maxAttempts: { type: 'string', enum: MAX_ATTEMPTS },
      caregiverName: { type: 'string' },
      caregiverPhone: { type: 'string' },
      stockRemaining: { type: 'integer', minimum: 0 },
    },
  },
}

export const updateMedicationSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'string' } },
  },
  body: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 1 },
      dose: { type: 'string', minLength: 1 },
      time: { type: 'string', pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$' },
      frequency: { type: 'string', enum: FREQUENCIES },
      alertInterval: { type: 'string', enum: ALERT_INTERVALS },
      maxAttempts: { type: 'string', enum: MAX_ATTEMPTS },
      caregiverName: { type: 'string', nullable: true },
      caregiverPhone: { type: 'string', nullable: true },
      stockRemaining: { type: 'integer', minimum: 0, nullable: true },
    },
  },
}
