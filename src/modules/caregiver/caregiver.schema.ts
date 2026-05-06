export const linkElderlySchema = {
  body: {
    type: 'object',
    required: ['elderlyEmail'],
    properties: {
      elderlyEmail: { type: 'string', format: 'email' },
    },
  },
}
