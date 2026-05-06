export const loginSchema = {
  body: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string', minLength: 6 },
    },
  },
}

export const registerSchema = {
  body: {
    type: 'object',
    required: ['name', 'email', 'password', 'role'],
    properties: {
      name: { type: 'string', minLength: 2 },
      email: { type: 'string', format: 'email' },
      password: { type: 'string', minLength: 8 },
      phone: { type: 'string' },
      role: { type: 'string', enum: ['usuario', 'cuidador', 'admin'] },
    },
  },
}

export const forgotPasswordSchema = {
  body: {
    type: 'object',
    required: ['email'],
    properties: {
      email: { type: 'string', format: 'email' },
    },
  },
}

export const verifyCodeSchema = {
  body: {
    type: 'object',
    required: ['email', 'code'],
    properties: {
      email: { type: 'string', format: 'email' },
      code: { type: 'string', minLength: 6, maxLength: 6 },
    },
  },
}

export const resetPasswordSchema = {
  body: {
    type: 'object',
    required: ['email', 'code', 'newPassword'],
    properties: {
      email: { type: 'string', format: 'email' },
      code: { type: 'string', minLength: 6, maxLength: 6 },
      newPassword: { type: 'string', minLength: 8 },
    },
  },
}
