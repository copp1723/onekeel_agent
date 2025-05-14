const Joi = require('joi');

// Email vendor configuration schema
const emailVendorSchema = Joi.object({
  emailPatterns: Joi.object({
    fromAddresses: Joi.array().items(Joi.string().email()).required(),
    subjectPatterns: Joi.array().items(Joi.string()).required(),
    attachmentTypes: Joi.array().items(Joi.string()).required(),
  }).required(),
  extractorConfig: Joi.object({
    type: Joi.string().valid('csv', 'excel').required(),
    dateColumn: Joi.string().required(),
    keyColumns: Joi.array().items(Joi.string()).required(),
    numericalColumns: Joi.array().items(Joi.string()).required(),
    categoryColumns: Joi.array().items(Joi.string()).required(),
  }).required(),
  insightConfig: Joi.object({
    priorityMetrics: Joi.array().items(Joi.string()).required(),
    comparisonPeriods: Joi.array().items(Joi.string()).required(),
  }).required(),
});

// Distribution configuration schema
const distributionSchema = Joi.object({
  roles: Joi.object().pattern(Joi.string(), Joi.object({
    emails: Joi.array().items(Joi.string().email()).required(),
    insightTypes: Joi.array().items(Joi.string()).required(),
  })).required(),
  schedules: Joi.object({
    daily: Joi.object({
      time: Joi.string().required(),
      roles: Joi.array().items(Joi.string()).required(),
    }).required(),
    weekly: Joi.object({
      time: Joi.string().required(),
      dayOfWeek: Joi.string().required(),
      roles: Joi.array().items(Joi.string()).required(),
    }).required(),
    monthly: Joi.object({
      time: Joi.string().required(),
      dayOfMonth: Joi.string().required(),
      roles: Joi.array().items(Joi.string()).required(),
    }).required(),
  }).required(),
});

// Function to validate email vendor configurations
const validateEmailVendorConfig = (config) => {
  return emailVendorSchema.validate(config);
};

// Function to validate distribution configurations
const validateDistributionConfig = (config) => {
  return distributionSchema.validate(config);
};

module.exports = {
  validateEmailVendorConfig,
  validateDistributionConfig,
};
