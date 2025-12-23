const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  fileName: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number
  },
  fileType: {
    type: String
  },
  extractedText: {
    type: String
  },
  parsedData: {
    name: String,
    email: String,
    phone: String,
    skills: [String],
    experience: [{
      company: String,
      role: String,
      duration: String,
      description: String,
      startDate: String,
      endDate: String
    }],
    education: [{
      degree: String,
      institution: String,
      year: String,
      field: String
    }],
    certifications: [String],
    seniority: {
      type: String,
      enum: ['Junior', 'Mid-Level', 'Senior', 'Lead', 'Principal']
    },
    totalYearsExperience: Number,
    summary: String,
    languages: [String],
    projects: [{
      name: String,
      description: String,
      technologies: [String]
    }]
  },
  status: {
    type: String,
    enum: ['pending', 'parsed', 'failed'],
    default: 'pending'
  },
  tags: [String],
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for text search
resumeSchema.index({ 'parsedData.skills': 1 });
resumeSchema.index({ 'parsedData.name': 'text', 'parsedData.email': 'text' });

resumeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Resume', resumeSchema);