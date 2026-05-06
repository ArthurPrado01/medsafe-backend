export const updateProfileSchema = {
  body: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 2 },
      phone: { type: 'string' },
    },
  },
}

export const changePasswordSchema = {
  body: {
    type: 'object',
    required: ['currentPassword', 'newPassword'],
    properties: {
      currentPassword: { type: 'string', minLength: 6 },
      newPassword: { type: 'string', minLength: 8 },
    },
  },
}

export const changeEmailSchema = {
  body: {
    type: 'object',
    required: ['newEmail', 'password'],
    properties: {
      newEmail: { type: 'string', format: 'email' },
      password: { type: 'string', minLength: 6 },
    },
  },
}

export const updateFcmTokenSchema = {
  body: {
    type: 'object',
    required: ['fcmToken'],
    properties: {
      fcmToken: { type: 'string' },
    },
  },
}
